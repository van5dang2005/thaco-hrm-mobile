// Mock of thaco_be_ql_buu_pham: parcels, delegations, reception. Rules mirror the .NET handlers.
const { uuid, vnAt, iso, DAY, bad, notFound, paginate, fieldOf, fieldsOf, filesOf } = require('./lib');

const S = { Waiting: 1, Due: 2, Overdue: 3, Cancelled: 4, HandedOver: 5 };
const D = { Expired: 1, DueSoon: 2, Active: 3, Rejected: 4, Waiting: 5 };
const T = { Default: 1, Specific: 2 };
const MAX_FILE = 5 * 1024 * 1024;

function createParcelService(common) {
  const { people, byUsername, byId, deptByKey, departments, notify } = common;
  const u = (username) => byUsername[username];
  let seq = 211;
  let txSeq = 311;

  const parcels = [];
  const delegations = [];

  const now = () => new Date();

  function addLog(target, { action, description, by, emailStatus = 0 }) {
    const person = by === 'SYSTEM' ? null : by;
    target.logs.unshift({
      id: uuid(),
      parcelId: target.kind === 'parcel' ? target.id : null,
      delegationId: target.kind === 'delegation' ? target.id : null,
      action,
      description,
      performedBy: person ? person.id : '00000000-0000-0000-0000-000000000000',
      performedName: person ? person.fullname : 'Hệ thống',
      performedCode: person ? person.employeeCode : 'SYSTEM',
      performedDepartment: person ? deptByKey[person.dept].name : null,
      isEmailSent: emailStatus !== 0,
      emailStatus,
      createdAt: iso(new Date()),
    });
  }

  function makeParcel({ receiver, sender, company, phone, address, createdDaysAgo, hour, minute, description, attachments = 0, by = u('nhung.vh') }) {
    const createdAt = new Date(vnAt(-createdDaysAgo, hour, minute));
    const p = {
      kind: 'parcel',
      id: uuid(),
      transactionCode: `BP-2510-${String(txSeq++).padStart(4, '0')}`,
      trackingNumber: `${String(seq++).padStart(4, '0')}_${sender.tracking}`,
      senderFullName: sender.name,
      senderCompanyName: company ?? null,
      senderPhoneNumber: phone ?? null,
      senderAddress: address ?? null,
      receiverId: receiver.id,
      receiverPhoneNumber: receiver.phone,
      departmentId: deptByKey[receiver.dept].id,
      description: description ?? null,
      note: null,
      receivedAt: iso(createdAt),
      createdAt: iso(createdAt),
      handOverAt: null,
      cancelledAt: null,
      cancellationReason: null,
      actualReceiverCode: null,
      status: S.Waiting,
      attachments: Array.from({ length: attachments }, (_, i) => ({ id: uuid(), fileName: `anh-${i + 1}.jpg`, filePath: `/uploads/sample-parcel-${(i % 3) + 1}.png` })),
      logs: [],
      deleted: false,
    };
    p.logs.push({
      id: uuid(),
      parcelId: p.id,
      delegationId: null,
      action: 'PARCEL_CREATED',
      description: 'Lễ tân tiếp nhận bưu phẩm',
      performedBy: by.id,
      performedName: by.fullname,
      performedCode: by.employeeCode,
      performedDepartment: deptByKey[by.dept].name,
      isEmailSent: true,
      emailStatus: 1,
      createdAt: iso(createdAt),
    });
    parcels.push(p);
    return p;
  }

  // ---- seed ----------------------------------------------------------------------------------
  const khoa = u('khoa.nm');
  const ha = u('ha.tt');
  const nam = u('nam.lv');
  const anh = u('anh.ph');
  const tung = u('tung.bt');
  const lan = u('lan.nt');

  const pBosch = makeParcel({ receiver: khoa, sender: { name: 'Phạm Quốc Bảo', tracking: 'VTP1029447182' }, company: 'Công ty TNHH Bosch Việt Nam', phone: '0905 xxx 118', createdDaysAgo: 6, hour: 8, minute: 10, description: 'Hồ sơ hợp đồng, phong bì A4', attachments: 2 });
  pBosch.senderFullName = 'Công ty TNHH Bosch Việt Nam';
  makeParcel({ receiver: khoa, sender: { name: 'Nguyễn Thị Lan', tracking: 'GHN8KX241PQ' }, createdDaysAgo: 0, hour: 8, minute: 15, description: 'Tài liệu tuyển dụng', attachments: 2 });
  makeParcel({ receiver: khoa, sender: { name: 'Trung tâm Đào tạo THACO', tracking: 'JNT8812004371' }, createdDaysAgo: 8, hour: 9, minute: 40, description: 'Chứng chỉ khóa học' });
  const pTiki = makeParcel({ receiver: khoa, sender: { name: 'Tiki Trading', tracking: 'GHN77Q10LMX' }, createdDaysAgo: 9, hour: 9, minute: 5 });
  Object.assign(pTiki, { status: S.HandedOver, handOverAt: iso(vnAt(-7, 10, 12)), actualReceiverCode: khoa.employeeCode, note: 'Nhận đủ' });
  const pSo = makeParcel({ receiver: khoa, sender: { name: 'Sở Kế hoạch và Đầu tư', tracking: 'VNP55120933' }, createdDaysAgo: 16, hour: 14, minute: 0 });
  Object.assign(pSo, { status: S.HandedOver, handOverAt: iso(vnAt(-14, 15, 47)), actualReceiverCode: nam.employeeCode });
  const pLazada = makeParcel({ receiver: khoa, sender: { name: 'Lazada Việt Nam', tracking: 'JNT40019822' }, createdDaysAgo: 23, hour: 10, minute: 0 });
  Object.assign(pLazada, { status: S.Cancelled, cancelledAt: iso(vnAt(-13, 8, 0)) });

  const pShopee = makeParcel({ receiver: ha, sender: { name: 'Shopee Express', tracking: 'SPXVN04418823' }, createdDaysAgo: 3, hour: 15, minute: 20, attachments: 1 });
  makeParcel({ receiver: ha, sender: { name: 'Điện Máy Xanh', tracking: 'GHN55AB01KZ' }, createdDaysAgo: 8, hour: 10, minute: 30 });
  makeParcel({ receiver: nam, sender: { name: 'FPT Shop', tracking: 'VTP99120044' }, createdDaysAgo: 1, hour: 11, minute: 0 });
  makeParcel({ receiver: anh, sender: { name: 'Văn phòng phẩm Hồng Hà', tracking: 'GHN3311AA' }, createdDaysAgo: 6, hour: 9, minute: 20 });
  makeParcel({ receiver: tung, sender: { name: 'Ngân hàng Vietcombank', tracking: 'VNP11002299' }, createdDaysAgo: 2, hour: 13, minute: 45, description: 'Thư bảo đảm' });
  makeParcel({ receiver: lan, sender: { name: 'Trường ĐH Đà Nẵng', tracking: 'VNP7788120' }, createdDaysAgo: 4, hour: 16, minute: 10 });

  function makeDelegation({ authorizer, delegator, type, parcelIds = [], startDays, endDays, status }) {
    const d = {
      kind: 'delegation',
      id: uuid(),
      authorizerId: authorizer.id,
      authorizerCode: authorizer.employeeCode,
      delegatorId: delegator.id,
      delegateCode: delegator.employeeCode,
      parcelIds,
      startDate: type === T.Default ? iso(vnAt(startDays, 0, 0)) : null,
      endDate: type === T.Default ? iso(vnAt(endDays, 23, 59)) : null,
      pendingEndDate: null,
      status,
      appliedType: type,
      handedOver: false,
      logs: [],
    };
    delegations.push(d);
    return d;
  }

  makeDelegation({ authorizer: khoa, delegator: anh, type: T.Specific, parcelIds: [pBosch.id], status: D.Waiting });
  makeDelegation({ authorizer: khoa, delegator: nam, type: T.Default, startDays: -4, endDays: 5, status: D.Active });
  makeDelegation({ authorizer: khoa, delegator: ha, type: T.Default, startDays: -20, endDays: -13, status: D.Expired });
  makeDelegation({ authorizer: tung, delegator: khoa, type: T.Default, startDays: 1, endDays: 11, status: D.Waiting });
  makeDelegation({ authorizer: ha, delegator: khoa, type: T.Default, startDays: -7, endDays: 2, status: D.Active });
  void pShopee;

  notify(khoa.id, { title: 'Bưu phẩm mới', content: 'Bạn có bưu phẩm từ Nguyễn Thị Lan đang chờ tại quầy lễ tân Tòa A.', code: 'NEW_PARCEL' });
  notify(khoa.id, { title: 'Bưu phẩm đến hạn', content: 'Bưu phẩm 0187_VTP1029447182 sẽ quá hạn vào ngày mai.', code: 'DUE_PARCEL' });
  notify(khoa.id, { title: 'Yêu cầu ủy quyền', content: 'Bùi Thanh Tùng muốn bạn nhận thay bưu phẩm.', code: 'NEW_DELEGATION' });

  // ---- derived state -------------------------------------------------------------------------
  function refreshParcel(p) {
    if (p.status === S.HandedOver || p.status === S.Cancelled) return p;
    const days = (Date.now() - new Date(p.createdAt).getTime()) / DAY;
    let next = S.Waiting;
    if (days >= 10) next = S.Cancelled;
    else if (days >= 7) next = S.Overdue;
    else if (days >= 6) next = S.Due;
    if (next !== p.status) {
      const label = { 2: 'Đến hạn', 3: 'Quá hạn', 4: 'Đã hủy' }[next];
      if (next === S.Cancelled) p.cancelledAt = iso(new Date(new Date(p.createdAt).getTime() + 10 * DAY));
      p.status = next;
      if (label) addLog(p, { action: 'PARCEL_STATUS_CHANGED', description: `Bưu phẩm chuyển sang trạng thái ${label}`, by: 'SYSTEM', emailStatus: 1 });
    }
    return p;
  }

  function refreshDelegation(d) {
    if (d.appliedType !== T.Default) return d;
    if (![D.Active, D.DueSoon].includes(d.status)) return d;
    const end = new Date(d.endDate).getTime();
    if (end < Date.now()) d.status = D.Expired;
    else if (end - Date.now() <= 3 * DAY) d.status = D.DueSoon;
    else d.status = D.Active;
    return d;
  }

  const live = () => parcels.filter((p) => !p.deleted).map(refreshParcel);
  const liveDelegations = () => delegations.map(refreshDelegation);

  function summaryUser(person) {
    if (!person) return null;
    const dept = deptByKey[person.dept];
    return {
      id: person.id,
      username: person.username,
      email: person.email,
      fullName: person.fullname,
      employeeCode: person.employeeCode,
      avatarUrl: null,
      phoneNumber: person.phone,
      unitName: 'THACO AUTO',
      departmentId: dept.id,
      departmentName: dept.name,
      jobTitleName: person.jobTitle,
      positionName: person.position,
    };
  }

  /** D-18 precedence: Detailed (Active/Waiting) for this parcel, else an in-window Default. */
  function relatedDelegationOf(p) {
    if (p.status === S.HandedOver || p.status === S.Cancelled) return null;
    const t = Date.now();
    const detailed = liveDelegations().find(
      (d) => d.appliedType === T.Specific && d.parcelIds.includes(p.id) && d.authorizerId === p.receiverId && [D.Active, D.Waiting].includes(d.status),
    );
    const fallback = liveDelegations().find(
      (d) =>
        d.appliedType === T.Default &&
        d.authorizerId === p.receiverId &&
        ([D.Active, D.DueSoon].includes(d.status) || (d.status === D.Waiting && d.pendingEndDate)) &&
        new Date(d.startDate).getTime() <= t &&
        new Date(d.endDate).getTime() >= t,
    );
    const d = detailed || fallback;
    if (!d) return null;
    return {
      id: d.id,
      authorizerId: d.authorizerId,
      authorizerCode: d.authorizerCode,
      delegatorId: d.delegatorId,
      delegateCode: d.delegateCode,
      parcelId: d.appliedType === T.Specific ? d.parcelIds[0] : null,
      startDate: d.startDate,
      endDate: d.endDate,
      status: d.status,
      pendingEndDate: d.pendingEndDate,
      delegator: summaryUser(byId[d.delegatorId]),
      authorizer: summaryUser(byId[d.authorizerId]),
    };
  }

  function parcelDto(p) {
    const receiver = byId[p.receiverId];
    const dept = departments.find((d) => d.id === p.departmentId);
    return {
      id: p.id,
      transactionCode: p.transactionCode,
      trackingNumber: p.trackingNumber,
      senderFullName: p.senderFullName,
      senderCompanyName: p.senderCompanyName,
      senderPhoneNumber: p.senderPhoneNumber,
      senderAddress: p.senderAddress,
      receiverId: p.receiverId,
      receiverCode: receiver.employeeCode,
      receiverFullName: receiver.fullname,
      receiverPhoneNumber: p.receiverPhoneNumber,
      receiverAvatarUrl: null,
      departmentId: p.departmentId,
      departmentName: dept?.name ?? null,
      description: p.description,
      note: p.note,
      receivedAt: p.receivedAt,
      createdAt: p.createdAt,
      handOverAt: p.handOverAt,
      cancelledAt: p.cancelledAt,
      cancellationReason: p.cancellationReason,
      actualReceiverCode: p.actualReceiverCode,
      status: p.status,
      attachments: p.attachments.map(({ id, fileName, filePath }) => ({ id, fileName, filePath, parcelId: p.id })),
      relatedDelegation: relatedDelegationOf(p),
      logs: [...p.logs, ...delegationLogsFor(p)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  function delegationLogsFor(p) {
    return delegations.filter((d) => d.parcelIds.includes(p.id)).flatMap((d) => d.logs);
  }

  function lookupDto(p, matchReason, owner) {
    const dto = parcelDto(p);
    delete dto.relatedDelegation;
    delete dto.createdAt;
    delete dto.cancelledAt;
    delete dto.cancellationReason;
    return {
      ...dto,
      matchReason,
      delegatorCode: matchReason ? owner.employeeCode : null,
      delegatorFullName: matchReason ? owner.fullname : null,
      delegationDepartmentName: matchReason ? deptByKey[owner.dept].name : null,
      delegationAvatarUrl: null,
    };
  }

  function delegationDto(d) {
    return {
      id: d.id,
      authorizerId: d.authorizerId,
      authorizerCode: d.authorizerCode,
      delegatorId: d.delegatorId,
      delegateCode: d.delegateCode,
      parcelId: d.appliedType === T.Specific ? d.parcelIds[0] ?? null : null,
      startDate: d.startDate,
      endDate: d.endDate,
      status: d.status,
      appliedType: d.appliedType,
      delegator: common.userDto(byId[d.delegatorId]),
      authorizer: common.userDto(byId[d.authorizerId]),
    };
  }

  const isReception = (user) => !!user.reception || user.roles.includes('Administrator');

  function inRange(p, query) {
    const from = query.get('fromDate');
    const to = query.get('toDate');
    const created = new Date(p.createdAt).getTime();
    if (from && created < new Date(from).getTime()) return false;
    if (to && created > new Date(to).getTime()) return false;
    return true;
  }

  function matchesSearch(p, search) {
    if (!search) return true;
    const s = search.toLowerCase();
    const r = byId[p.receiverId];
    return [p.trackingNumber, p.senderFullName, r.employeeCode, r.fullname].some((v) => v?.toLowerCase().includes(s));
  }

  function stats(list) {
    return {
      total: list.length,
      waiting: list.filter((p) => p.status === S.Waiting || p.status === S.Due).length,
      handedOver: list.filter((p) => p.status === S.HandedOver).length,
      overdue: list.filter((p) => p.status === S.Overdue).length,
      cancelled: list.filter((p) => p.status === S.Cancelled).length,
    };
  }

  /** Parcels visible in "Bưu phẩm của tôi": mine + those I may collect for someone else. */
  function myEntries(user, query) {
    const entries = [];
    const t = Date.now();
    for (const p of live()) {
      if (p.receiverId === user.id) {
        entries.push({ p, reason: 0, owner: user });
        continue;
      }
      if (p.status === S.HandedOver || p.status === S.Cancelled) continue;
      const owner = byId[p.receiverId];
      const detailed = liveDelegations().find((d) => d.appliedType === T.Specific && d.parcelIds.includes(p.id) && d.delegatorId === user.id && d.status === D.Active);
      if (detailed) {
        entries.push({ p, reason: 1, owner });
        continue;
      }
      const def = liveDelegations().find(
        (d) =>
          d.appliedType === T.Default &&
          d.authorizerId === p.receiverId &&
          d.delegatorId === user.id &&
          [D.Active, D.DueSoon].includes(d.status) &&
          new Date(d.startDate).getTime() <= t &&
          new Date(d.endDate).getTime() >= t,
      );
      if (def) entries.push({ p, reason: 2, owner });
    }
    const statuses = query.getAll('statuses').map(Number);
    const search = query.get('search');
    const addDelegation = query.get('addDelegation') === 'true';
    return entries
      .filter(({ p }) => !statuses.length || statuses.includes(p.status))
      .filter(({ p }) => matchesSearch(p, search) && inRange(p, query))
      .filter(({ p, reason }) => {
        if (!addDelegation) return true;
        const hasDetailed = delegations.some((d) => d.appliedType === T.Specific && d.parcelIds.includes(p.id) && [D.Active, D.Waiting].includes(d.status));
        return reason === 0 && [S.Waiting, S.Due, S.Overdue].includes(p.status) && !hasDetailed;
      })
      .sort((a, b) => b.p.createdAt.localeCompare(a.p.createdAt));
  }

  function findParcel(id) {
    const p = live().find((x) => x.id === id);
    if (!p) throw notFound();
    return p;
  }

  function validateFiles(files) {
    if (files.length > 5) throw bad('LIMIT_5_ATTACHMENTS');
    if (files.some((f) => f.size > MAX_FILE)) throw bad('EXCEED_5MB_LIMIT');
  }

  function rawTracking(value) {
    return String(value || '').replace(/^\d{4}_/, '');
  }

  function createOne(form, trackingNumber, user) {
    const receiver = byId[fieldOf(form, 'receiverId')];
    if (!receiver) throw bad('RECEIVER_NOT_FOUND');
    if (!trackingNumber) throw bad('PARCEL_TRACKING_NUMBER_MAX_LENGTH');
    if (trackingNumber.length > 100) throw bad('PARCEL_TRACKING_NUMBER_MAX_LENGTH');
    if (live().some((p) => rawTracking(p.trackingNumber).toLowerCase() === trackingNumber.toLowerCase())) throw bad('PARCEL_TRACKING_NUMBER_DUPLICATE');
    const description = fieldOf(form, 'description') || null;
    if (description && description.length > 1000) throw bad('PARCEL_DESCRIPTION_MAX_LENGTH');
    const createdAt = new Date();
    const receivedAt = fieldOf(form, 'receivedAt') ? new Date(fieldOf(form, 'receivedAt')) : createdAt;
    const files = filesOf(form, 'attachmentFiles');
    const sendEmail = fieldOf(form, 'isSendEmail') === 'true';
    const p = {
      kind: 'parcel',
      id: uuid(),
      transactionCode: `BP-2510-${String(txSeq++).padStart(4, '0')}`,
      trackingNumber: `${String(seq++).padStart(4, '0')}_${trackingNumber}`,
      senderFullName: fieldOf(form, 'senderFullName'),
      senderCompanyName: fieldOf(form, 'senderCompanyName') || null,
      senderPhoneNumber: fieldOf(form, 'senderPhoneNumber') || null,
      senderAddress: fieldOf(form, 'senderAddress') || null,
      receiverId: receiver.id,
      receiverPhoneNumber: fieldOf(form, 'receiverPhoneNumber') || receiver.phone,
      departmentId: deptByKey[receiver.dept].id,
      description,
      note: null,
      receivedAt: iso(receivedAt),
      createdAt: iso(createdAt),
      handOverAt: null,
      cancelledAt: null,
      cancellationReason: null,
      actualReceiverCode: null,
      status: S.Waiting,
      attachments: files.map((f) => ({ id: f.id, fileName: f.filename, filePath: `/uploads/${f.storedAs}` })),
      logs: [],
      deleted: false,
    };
    if (!p.senderFullName) throw bad('RECEIVER_NOT_FOUND', 'Sender required');
    addLog(p, { action: 'PARCEL_CREATED', description: 'Lễ tân tiếp nhận bưu phẩm', by: user, emailStatus: sendEmail ? 1 : 0 });
    parcels.push(p);
    notify(receiver.id, { title: 'Bưu phẩm mới', content: `Bạn có bưu phẩm từ ${p.senderFullName} đang chờ tại quầy lễ tân.`, code: 'NEW_PARCEL' });
    return p;
  }

  function ensureHandoverEligible(p, actual) {
    if (p.status === S.Cancelled) throw bad('CANNOT_HANDOVER_CANCELLED');
    if (![S.Waiting, S.Due, S.Overdue].includes(p.status)) throw bad('PARCEL_LOCKED_TO_CONFIRM');
    if (actual.id === p.receiverId) return null;
    const t = Date.now();
    const detailed = liveDelegations().find(
      (d) => d.appliedType === T.Specific && d.parcelIds.includes(p.id) && d.authorizerId === p.receiverId && d.delegatorId === actual.id && d.status === D.Active,
    );
    const def = liveDelegations().find(
      (d) =>
        d.appliedType === T.Default &&
        d.authorizerId === p.receiverId &&
        d.delegatorId === actual.id &&
        ([D.Active, D.DueSoon].includes(d.status) || (d.status === D.Waiting && d.pendingEndDate)) &&
        new Date(d.startDate).getTime() <= t &&
        new Date(d.endDate).getTime() >= t,
    );
    const valid = detailed || def;
    if (!valid) throw bad('DELEGATION_NOT_FOUND');
    return valid;
  }

  function handover(p, actual, note, sendEmail, user) {
    const via = ensureHandoverEligible(p, actual);
    p.status = S.HandedOver;
    p.handOverAt = iso(new Date());
    p.actualReceiverCode = actual.employeeCode;
    p.note = note || null;
    addLog(p, {
      action: 'PARCEL_HANDED_OVER',
      description: via ? `Bàn giao cho ${actual.fullname} (được ủy quyền)` : `Bàn giao cho ${actual.fullname}`,
      by: user,
      emailStatus: sendEmail ? 1 : 0,
    });
    if (via) {
      via.handedOver = true;
      if (via.appliedType === T.Specific) {
        via.status = D.Expired;
        via.logs.unshift({ ...p.logs[0], id: uuid(), action: 'DELEGATION_EXPIRED_ON_HANDOVER', description: 'Ủy quyền chi tiết hết hiệu lực sau khi bàn giao' });
      }
    }
    notify(p.receiverId, { title: 'Bưu phẩm đã bàn giao', content: `Bưu phẩm ${p.trackingNumber} đã được bàn giao cho ${actual.fullname}.`, code: 'HANDOVER_PARCEL' });
  }

  // ---- delegation helpers --------------------------------------------------------------------
  function hasActiveOrWaitingDefault(authorizerId, start, end) {
    return liveDelegations().some((d) => {
      if (d.appliedType !== T.Default || d.authorizerId !== authorizerId) return false;
      if (![D.Active, D.DueSoon, D.Waiting].includes(d.status)) return false;
      if (!start || !end) return true;
      return new Date(d.startDate) <= new Date(end) && new Date(d.endDate) >= new Date(start);
    });
  }

  function createDelegation(user, { delegatorId, parcelId, startDate, endDate, isSendEmail }) {
    const delegatee = byId[delegatorId];
    if (!delegatee) throw bad('DELEGATEE_NOT_FOUND');
    let authorizerId = user.id;
    if (parcelId) authorizerId = findParcel(parcelId).receiverId;
    if (hasActiveOrWaitingDefault(authorizerId, startDate, endDate)) throw bad('DELEGATION_DEFAULT_ACTIVE');
    if (parcelId && delegations.some((d) => d.appliedType === T.Specific && d.parcelIds.includes(parcelId) && [D.Active, D.Waiting].includes(d.status))) {
      throw bad('DELEGATION_PARCEL_LOCKED');
    }
    if (delegatee.id === authorizerId || delegatee.id === user.id) throw bad('CANNOT_DELEGATE_RECEIVER');
    if (!parcelId) {
      if (!startDate || !endDate) throw bad('DATA_NOT_FOUND');
      if (new Date(endDate) <= new Date(startDate)) throw bad('DELEGATION_END_DATE_INVALID');
    }
    const requireApproval = deptByKey[delegatee.dept].requireApproval;
    const owner = byId[authorizerId];
    const d = {
      kind: 'delegation',
      id: uuid(),
      authorizerId: owner.id,
      authorizerCode: owner.employeeCode,
      delegatorId: delegatee.id,
      delegateCode: delegatee.employeeCode,
      parcelIds: parcelId ? [parcelId] : [],
      startDate: parcelId ? null : iso(new Date(startDate)),
      endDate: parcelId ? null : iso(new Date(endDate)),
      pendingEndDate: null,
      status: requireApproval ? D.Waiting : D.Active,
      appliedType: parcelId ? T.Specific : T.Default,
      handedOver: false,
      logs: [],
    };
    refreshDelegation(d);
    d.logs.unshift({
      id: uuid(),
      parcelId: parcelId ?? null,
      delegationId: d.id,
      action: 'DELEGATION_CREATED',
      description: `${user.fullname} ủy quyền cho ${delegatee.fullname} nhận bưu phẩm${requireApproval ? ' và cần xác nhận (đồng ý/từ chối).' : '.'}`,
      performedBy: user.id,
      performedName: user.fullname,
      performedCode: user.employeeCode,
      performedDepartment: deptByKey[user.dept].name,
      isEmailSent: !!isSendEmail,
      emailStatus: isSendEmail ? 1 : 0,
      createdAt: iso(new Date()),
    });
    delegations.push(d);
    notify(delegatee.id, { title: 'Ủy quyền nhận bưu phẩm', content: `${owner.fullname} ủy quyền cho bạn nhận bưu phẩm.`, code: 'NEW_DELEGATION' });
    return d;
  }

  function findDelegation(id) {
    const d = liveDelegations().find((x) => x.id === id);
    if (!d) throw notFound();
    return d;
  }

  // ---- routes --------------------------------------------------------------------------------
  const menusFor = (user) => {
    const base = [
      { id: uuid(), name: 'Bưu phẩm của tôi', url: '/buu-kien-cua-toi', parentId: null, index: 1, icon: 'package', isActive: true },
      { id: uuid(), name: 'Danh sách đăng ký ủy quyền', url: '/danh-sach-dang-ky-uy-quyen', parentId: null, index: 2, icon: 'users', isActive: true },
    ];
    if (isReception(user)) {
      base.push({ id: uuid(), name: 'Quản lý bưu phẩm', url: '/buu-kien', parentId: null, index: 0, icon: 'inbox', isActive: true });
      base.push({ id: uuid(), name: 'Báo cáo', url: '/bao-cao/buu-pham-don-vi', parentId: null, index: 5, icon: 'chart', isActive: true });
    }
    return base;
  };

  const departmentDto = (d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    parentId: null,
    level: 3,
    isActive: true,
    fullPathName: `THACO / THACO AUTO / ${d.name}`,
    departmentConfig: { departmentId: d.id, requireApproval: d.requireApproval, isReportEnabled: true },
  });

  return [
    ['GET', '/api/menus', ({ user, query }) => paginate(menusFor(user), query)],
    ['GET', '/api/departments/accessible', ({ user }) => (isReception(user) ? departments : departments.filter((d) => d.key === user.dept)).map(departmentDto)],
    [
      'GET',
      '/api/parcels/my/stats',
      ({ user, query }) => stats(myEntries(user, new URLSearchParams({ fromDate: query.get('fromDate') || '', toDate: query.get('toDate') || '' })).filter((e) => e.reason === 0).map((e) => e.p)),
    ],
    ['GET', '/api/parcels/my', ({ user, query }) => paginate(myEntries(user, query).map(({ p, reason, owner }) => lookupDto(p, reason, owner)), query)],
    [
      'GET',
      '/api/parcels/stats',
      ({ user, query }) => {
        if (!isReception(user)) return stats([]);
        const dept = query.get('departmentId');
        return stats(live().filter((p) => (!dept || p.departmentId === dept) && inRange(p, query)));
      },
    ],
    [
      'GET',
      '/api/parcels',
      ({ user, query }) => {
        if (!isReception(user)) return paginate([], query);
        const status = Number(query.get('status') || 0);
        const dept = query.get('departmentId');
        const list = live()
          .filter((p) => (!status || p.status === status) && (!dept || p.departmentId === dept) && matchesSearch(p, query.get('search')) && inRange(p, query))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return paginate(list.map(parcelDto), query);
      },
    ],
    ['GET', '/api/parcels/:id', ({ params }) => parcelDto(findParcel(params.id))],
    [
      'POST',
      '/api/parcels/bulk',
      ({ form, user }) => {
        const numbers = fieldsOf(form, 'trackingNumbers').map((s) => s.trim()).filter(Boolean);
        if (numbers.length > 100) throw bad('PARCEL_TRACKING_NUMBER_MAX_QUANTITY');
        validateFiles(filesOf(form, 'attachmentFiles'));
        return numbers.map((n) => parcelDto(createOne(form, n, user)));
      },
    ],
    [
      'POST',
      '/api/parcels',
      ({ form, user }) => {
        validateFiles(filesOf(form, 'attachmentFiles'));
        return { __status: 201, body: parcelDto(createOne(form, (fieldOf(form, 'trackingNumber') || '').trim(), user)) };
      },
    ],
    [
      'PUT',
      '/api/parcels/:id',
      ({ params, form, user }) => {
        const p = findParcel(params.id);
        const cancellationNote = fieldOf(form, 'cancellationNote');
        if (p.status === S.Cancelled) {
          if (p.cancellationReason) throw bad('PARCEL_LOCKED_CANCELLATION_NOTE');
          if (!cancellationNote) throw bad('PARCEL_LOCKED_TO_EDIT');
          p.cancellationReason = cancellationNote;
          return parcelDto(p);
        }
        if (p.status !== S.Waiting) throw bad('PARCEL_LOCKED_TO_EDIT');
        const tracking = fieldOf(form, 'trackingNumber') || p.trackingNumber;
        if (tracking.split('_')[0] !== p.trackingNumber.split('_')[0]) throw bad('SEQUENCE_CODE_CANNOT_CHANGE');
        const keep = fieldsOf(form, 'attachmentIds');
        const files = filesOf(form, 'attachmentFiles');
        if (keep.length + files.length > 5) throw bad('LIMIT_5_ATTACHMENTS');
        if (files.some((f) => f.size > MAX_FILE)) throw bad('EXCEED_5MB_LIMIT');
        const receiver = byId[fieldOf(form, 'receiverId')] || byId[p.receiverId];
        const changedReceiver = receiver.id !== p.receiverId;
        Object.assign(p, {
          trackingNumber: tracking,
          senderFullName: fieldOf(form, 'senderFullName') || p.senderFullName,
          senderCompanyName: fieldOf(form, 'senderCompanyName') || null,
          senderPhoneNumber: fieldOf(form, 'senderPhoneNumber') || null,
          senderAddress: fieldOf(form, 'senderAddress') || null,
          description: fieldOf(form, 'description') || null,
          receiverId: receiver.id,
          departmentId: deptByKey[receiver.dept].id,
          attachments: [...p.attachments.filter((a) => keep.includes(a.id)), ...files.map((f) => ({ id: f.id, fileName: f.filename, filePath: `/uploads/${f.storedAs}` }))],
        });
        addLog(p, { action: 'PARCEL_UPDATED', description: 'Cập nhật thông tin bưu phẩm', by: user, emailStatus: changedReceiver ? 1 : 0 });
        return parcelDto(p);
      },
    ],
    [
      'DELETE',
      '/api/parcels/:id',
      ({ params }) => {
        const p = findParcel(params.id);
        if (p.status !== S.Waiting) throw bad('PARCEL_LOCKED_TO_DELETE');
        p.deleted = true;
        return undefined;
      },
    ],
    [
      'POST',
      '/api/parcels/bulk-handover',
      ({ body, user }) => {
        const actual = byId[body.userId];
        if (!actual) throw bad('RECEIVER_NOT_FOUND');
        const list = body.parcelIds.map(findParcel);
        list.forEach((p) => ensureHandoverEligible(p, actual));
        list.forEach((p) => handover(p, actual, body.note, body.isSendEmail, user));
        return list.map(parcelDto);
      },
    ],
    [
      'POST',
      '/api/parcels/:id/handover',
      ({ params, body, user }) => {
        const p = findParcel(params.id);
        const actual = byId[body.userId];
        if (!actual) throw bad('RECEIVER_NOT_FOUND');
        handover(p, actual, body.note, body.isSendEmail, user);
        return parcelDto(p);
      },
    ],
    [
      'POST',
      '/api/parcels/:id/remind',
      ({ params, user }) => {
        const p = findParcel(params.id);
        if (![S.Due, S.Overdue].includes(p.status)) throw bad('ONLY_REMIND_OVER_DUE_PARCEL');
        const related = relatedDelegationOf(p);
        const target = related && [D.Active, D.DueSoon].includes(related.status) ? related.delegatorId : p.receiverId;
        notify(target, { title: 'Nhắc nhận bưu phẩm', content: `Bưu phẩm ${p.trackingNumber} đang chờ bạn tại quầy lễ tân.`, code: 'REMIND_PARCEL' });
        addLog(p, { action: 'PARCEL_REMINDED', description: 'Lễ tân gửi nhắc nhở nhận bưu phẩm', by: user, emailStatus: 1 });
        return true;
      },
    ],
    // ---- delegations ----
    [
      'GET',
      '/api/delegations',
      ({ user, query }) => {
        const status = Number(query.get('status') || 0);
        const isDefault = query.get('isDefault');
        const list = liveDelegations()
          .filter((d) => d.authorizerId === user.id || d.delegatorId === user.id)
          .filter((d) => !status || d.status === status)
          .filter((d) => isDefault === null || isDefault === '' || (isDefault === 'true') === (d.appliedType === T.Default))
          .reverse();
        return paginate(list.map(delegationDto), query);
      },
    ],
    ['POST', '/api/delegations/bulk', ({ body, user }) => body.parcelIds.map((parcelId) => delegationDto(createDelegation(user, { ...body, parcelId })))],
    ['POST', '/api/delegations', ({ body, user }) => delegationDto(createDelegation(user, body))],
    [
      'POST',
      '/api/delegations/edit',
      ({ body, user }) => {
        const d = findDelegation(body.id);
        if (d.authorizerId !== user.id) throw notFound();
        if (!((d.status === D.Waiting && !d.pendingEndDate) || d.status === D.Rejected)) throw bad('DELEGATION_STATUS_INVALID');
        const delegatee = byId[body.delegatorId];
        if (!delegatee) throw bad('DELEGATEE_NOT_FOUND');
        if (delegatee.id === d.authorizerId) throw bad('CANNOT_DELEGATE_RECEIVER');
        d.delegatorId = delegatee.id;
        d.delegateCode = delegatee.employeeCode;
        if (d.appliedType === T.Default && body.startDate && body.endDate) {
          d.startDate = iso(new Date(body.startDate));
          d.endDate = iso(new Date(body.endDate));
        }
        d.status = deptByKey[delegatee.dept].requireApproval ? D.Waiting : D.Active;
        refreshDelegation(d);
        notify(delegatee.id, { title: 'Ủy quyền nhận bưu phẩm', content: `${user.fullname} ủy quyền cho bạn nhận bưu phẩm.`, code: 'NEW_DELEGATION' });
        return delegationDto(d);
      },
    ],
    [
      'POST',
      '/api/delegations/:id/accept',
      ({ params, user }) => {
        const d = findDelegation(params.id);
        if (d.delegatorId !== user.id) throw notFound();
        if (d.status !== D.Waiting) throw bad('DELEGATION_STATUS_INVALID');
        if (d.pendingEndDate) {
          d.endDate = d.pendingEndDate;
          d.pendingEndDate = null;
        }
        d.status = D.Active;
        refreshDelegation(d);
        return delegationDto(d);
      },
    ],
    [
      'POST',
      '/api/delegations/:id/reject',
      ({ params, user }) => {
        const d = findDelegation(params.id);
        if (d.delegatorId !== user.id) throw notFound();
        if (d.status !== D.Waiting) throw bad('DELEGATION_STATUS_INVALID');
        if (d.pendingEndDate) {
          d.pendingEndDate = null;
          d.status = D.Active;
          refreshDelegation(d);
        } else d.status = D.Rejected;
        return delegationDto(d);
      },
    ],
    [
      'POST',
      '/api/delegations/:id/renew',
      ({ params, body, user }) => {
        const d = findDelegation(params.id);
        if (d.authorizerId !== user.id) throw notFound();
        if (d.appliedType === T.Specific) throw bad('DELEGATION_RENEW_NOT_DETAILED');
        if (![D.Active, D.DueSoon].includes(d.status)) throw bad('DELEGATION_STATUS_INVALID');
        if (new Date(body.newEndDate) <= new Date(d.endDate)) throw bad('DELEGATION_END_DATE_INVALID');
        if (deptByKey[byId[d.delegatorId].dept].requireApproval) {
          d.pendingEndDate = iso(new Date(body.newEndDate));
          d.status = D.Waiting;
        } else {
          d.endDate = iso(new Date(body.newEndDate));
          refreshDelegation(d);
        }
        return delegationDto(d);
      },
    ],
    [
      'PATCH',
      '/api/delegations/:id/teminate',
      ({ params, body, user }) => {
        const d = findDelegation(params.id);
        if (d.authorizerId !== user.id) throw bad('YOU_NOT_AUTHOR_DELEGATION');
        if (!([D.DueSoon, D.Active].includes(d.status) || (d.status === D.Waiting && !d.pendingEndDate))) throw bad('DELEGATION_STATUS_INVALID');
        if (d.appliedType === T.Specific) throw bad('CAN_NOT_TERMINATE_DELEGATION');
        if (new Date(d.endDate) < new Date(body.newEndDate)) throw bad('NEW_END_DATE_TERMINATE_INVALID');
        d.endDate = iso(new Date(body.newEndDate));
        if (new Date(d.endDate) <= new Date()) d.status = D.Expired;
        else refreshDelegation(d);
        return delegationDto(d);
      },
    ],
    [
      'DELETE',
      '/api/delegations/:id',
      ({ params, user }) => {
        const d = findDelegation(params.id);
        if (d.handedOver) throw bad('DELEGATION_HAS_HANDEDOVER');
        if (d.authorizerId !== user.id) throw bad('YOU_NOT_AUTHOR_DELEGATION');
        delegations.splice(delegations.indexOf(d), 1);
        return undefined;
      },
    ],
  ];
}

module.exports = { createParcelService };
