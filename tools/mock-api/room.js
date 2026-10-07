// Mock of thaco_be_ql_phong_hop: areas, rooms, bookings, multi-level approvals.
const { uuid, vnAt, iso, DAY, VN_OFFSET, bad, conflict, notFound, paginate, fieldOf, fieldsOf, filesOf, indexedObjects } = require('./lib');

const B = { Waiting: 1, Approved: 2, Rejected: 3, Finished: 4, Canceled: 5 };
const MAX_FILE = 10 * 1024 * 1024;

/** Vietnam wall-clock helpers (the server compares local hours like the web app does). */
const vnDate = (d) => new Date(new Date(d).getTime() + VN_OFFSET);
const vnMinutes = (d) => {
  const v = vnDate(d);
  return v.getUTCHours() * 60 + v.getUTCMinutes();
};
const vnDayKey = (d) => vnDate(d).toISOString().slice(0, 10);
const parseHm = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

function createRoomService(common) {
  const { byUsername, byId, deptByKey, notify, stableId } = common;
  const u = (n) => byUsername[n];

  // ---- organisation: THACO > THACO AUTO > departments, THACO > THACO Industries > Kỹ thuật ----
  const root = { id: stableId('org:thaco'), name: 'THACO', code: 'THACO', parentId: null, level: 1 };
  const auto = { id: stableId('org:auto'), name: 'THACO AUTO', code: 'AUTO', parentId: root.id, level: 2 };
  const industries = { id: stableId('org:ind'), name: 'THACO Industries', code: 'IND', parentId: root.id, level: 2 };
  const indTech = { id: stableId('org:ind-tech'), name: 'Phòng Kỹ thuật Industries', code: 'KT', parentId: industries.id, level: 3 };
  const leafDepts = common.departments.map((d) => ({ id: d.id, name: d.name, code: d.code, parentId: auto.id, level: 3 }));
  const allDepts = [root, auto, industries, indTech, ...leafDepts];

  const areas = [
    { id: stableId('area:cl'), name: 'THACO Chu Lai', code: 'CL', isActive: true, departmentIds: [auto.id] },
    { id: stableId('area:hcm'), name: 'Văn phòng TP.HCM', code: 'HCM', isActive: true, departmentIds: [industries.id] },
  ];

  const service = (key, name) => ({ id: stableId(`svc:${key}`), name, code: key.toUpperCase(), isActive: true, createdAt: iso(new Date()), updatedAt: iso(new Date()) });
  const services = {
    water: service('water', 'Nước uống'),
    screen: service('screen', 'Màn hình'),
    online: service('online', 'Họp trực tuyến'),
    fruit: service('fruit', 'Trái cây'),
    sound: service('sound', 'Âm thanh'),
  };

  const deptDto = (d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    parentId: d.parentId,
    level: d.level,
    isActive: true,
    areas: areas.filter((a) => a.departmentIds.includes(d.id)).map(areaDto),
  });

  function areaDto(a) {
    return { id: a.id, name: a.name, code: a.code, isActive: a.isActive, createdAt: iso(new Date()), updatedAt: iso(new Date()) };
  }

  common.setDepartmentDecorator((deptId) => ({
    parentId: allDepts.find((d) => d.id === deptId)?.parentId ?? null,
    // Direct area links only, like DepartmentDto.Areas in the real service.
    areas: areas.filter((a) => a.departmentIds.includes(deptId)).map(areaDto),
  }));

  const isDescendantOrSelf = (deptId, targetIds) => {
    let current = allDepts.find((d) => d.id === deptId);
    while (current) {
      if (targetIds.includes(current.id)) return true;
      current = allDepts.find((d) => d.id === current.parentId);
    }
    return false;
  };

  // ---- rooms & workflows ----------------------------------------------------------------------
  const rooms = [];
  const workflows = [];

  function addRoom(spec, steps) {
    const room = {
      id: stableId(`room:${spec.code}`),
      name: spec.name,
      code: spec.code,
      code2: spec.code2 ?? null,
      numberOfSeats: spec.seats,
      priority: spec.priority,
      areaId: spec.area.id,
      isActive: true,
      openedAt: spec.open ?? '07:30:00',
      closedAt: spec.close ?? '18:00:00',
      departmentId: spec.dept ?? deptByKey.hcns.id,
      isDisableOverlappingTimes: !!spec.noOverlap,
      isDisableCrossLevelDepartment: !!spec.crossDept,
      isDisableCrossLevelArea: !!spec.crossArea,
      isDisableSubscriberCancel: !!spec.noCancel,
      isSendEmailToApprover: true,
      isDayLimited: !!spec.maxDays,
      maxAdvanceRegistrationDays: spec.maxDays ?? null,
      serviceIds: spec.services ?? [],
    };
    rooms.push(room);
    if (steps?.length) {
      const wf = { id: stableId(`wf:${spec.code}`), name: `Quy trình ${spec.name}`, roomId: room.id, description: null, isActive: true, steps: [] };
      steps.forEach((step, i) => {
        const stepId = stableId(`step:${spec.code}:${i}`);
        wf.steps.push({
          id: stepId,
          name: step.name,
          workflowId: wf.id,
          order: step.order ?? i + 1,
          actionType: step.notify ? 2 : 1,
          isActive: true,
          handlers: step.users.map((username) => ({ id: stableId(`handler:${spec.code}:${i}:${username}`), stepId, userId: u(username).id })),
        });
      });
      workflows.push(wf);
    }
    return room;
  }

  const [cl, hcm] = areas;
  const chuLai = addRoom(
    { name: 'Chu Lai 1', code: 'CL1', code2: 'T3', seats: 12, priority: 1, area: cl, noCancel: true, services: [services.water.id, services.screen.id, services.online.id] },
    [
      { name: 'Trưởng ban', users: ['ha.tt'] },
      { name: 'Hành chính Chu Lai', users: ['nam.lv', 'anh.ph'] },
      { name: 'Lễ tân Tòa A', users: ['nhung.vh'], notify: true },
    ],
  );
  const kyHa = addRoom({ name: 'Kỳ Hà', code: 'KH', code2: 'T5', seats: 8, priority: 2, area: cl, services: [services.water.id, services.fruit.id] }, [
    { name: 'Hành chính', users: ['khoa.nm', 'lan.nt'] },
  ]);
  const nuiThanh = addRoom({ name: 'Núi Thành', code: 'NT', code2: 'T3', seats: 6, priority: 3, area: cl, maxDays: 14, services: [services.water.id] }, [
    { name: 'Hành chính', users: ['khoa.nm'] },
  ]);
  const tamHiep = addRoom({ name: 'Tam Hiệp', code: 'TH', code2: 'T2', seats: 10, priority: 4, area: cl, services: [services.water.id, services.screen.id] }, [
    { name: 'Hành chính', users: ['khoa.nm'] },
  ]);
  const truongHai = addRoom({ name: 'Trường Hải', code: 'THA', code2: 'T1', seats: 80, priority: 5, area: cl, noOverlap: true, open: '07:00:00', close: '20:00:00', services: [services.screen.id, services.sound.id] });
  addRoom({ name: 'Lab B2', code: 'LB2', code2: 'Ban Tài chính', seats: 4, priority: 6, area: cl, crossDept: true, dept: deptByKey.tc.id }, [{ name: 'Trưởng ban', users: ['tung.bt'] }]);
  addRoom({ name: 'Sài Gòn 1', code: 'SG1', code2: 'T8', seats: 10, priority: 1, area: hcm, crossArea: true, dept: indTech.id }, [{ name: 'Hành chính', users: ['bao.pq'] }]);
  addRoom({ name: 'Sài Gòn 2', code: 'SG2', code2: 'T8', seats: 6, priority: 2, area: hcm, dept: indTech.id });

  const workflowOf = (roomId) => workflows.find((w) => w.roomId === roomId && w.isActive);
  const approvalSteps = (roomId) => (workflowOf(roomId)?.steps ?? []).filter((s) => s.actionType === 1 && s.isActive).sort((a, b) => a.order - b.order);
  const handlerById = (id) => workflows.flatMap((w) => w.steps).flatMap((s) => s.handlers.map((h) => ({ ...h, step: s }))).find((h) => h.id === id);

  // ---- bookings -------------------------------------------------------------------------------
  const bookings = [];
  let codeSeq = 180;

  function newBooking({ room, creator, from, to, content, groupId, status = B.Waiting, participants = [], participantText = null, people = 6, serviceIds = [], attachments = [], confidential = false }) {
    const b = {
      id: uuid(),
      roomId: room.id,
      groupId: groupId ?? uuid(),
      code: `PH-2610-${String(codeSeq++).padStart(4, '0')}`,
      from: iso(from),
      to: iso(to),
      status,
      content,
      participant: participantText,
      phoneNumber: creator.phone,
      numberOfParticipants: people,
      isConfidentialContent: confidential,
      reason: null,
      createdBy: creator.id,
      createdAt: iso(new Date()),
      serviceIds,
      attachments,
      participants: participants.map((p) => ({ id: uuid(), userId: u(p.user).id, isHost: !!p.host, isPrepareContent: !!p.prepare })),
      approvals: [],
    };
    bookings.push(b);
    return b;
  }

  function startWorkflow(b) {
    const steps = approvalSteps(b.roomId);
    if (!steps.length) {
      b.status = B.Approved;
      autoCancelConflicts(b);
      return;
    }
    addStepRows(b, steps[0]);
  }

  function addStepRows(b, step) {
    step.handlers.forEach((h) => b.approvals.push({ id: uuid(), approvalHandlerId: h.id, isApproved: null, processedAt: null, processedBy: null, comment: null }));
    step.handlers.forEach((h) => notify(h.userId, { title: 'Có phiếu cần duyệt', content: `${b.content} · ${b.code}`, code: 'NEW_BOOKING' }));
  }

  const overlaps = (a, b) => new Date(a.from) < new Date(b.to) && new Date(a.to) > new Date(b.from);

  function autoCancelConflicts(approved) {
    bookings
      .filter((o) => o.id !== approved.id && o.groupId !== approved.groupId && o.roomId === approved.roomId && o.status === B.Waiting && overlaps(o, approved))
      .forEach((o) => {
        o.status = B.Canceled;
        o.reason = 'Tự động hủy do trùng lịch với phiếu đã được duyệt';
        notify(o.createdBy, { title: 'Phiếu bị hủy', content: `${o.content} bị hủy do trùng giờ.`, code: 'BOOKING_AUTO_CANCELLED' });
      });
  }

  /** Approve the current user's step on one booking; advances to the next step or completes. */
  function approveOne(b, user, comment) {
    const mine = b.approvals.filter((a) => handlerById(a.approvalHandlerId)?.userId === user.id);
    if (!mine.length || b.status !== B.Waiting) return false;
    const stepId = handlerById(mine[0].approvalHandlerId).step.id;
    const rows = b.approvals.filter((a) => handlerById(a.approvalHandlerId).step.id === stepId);
    const t = iso(new Date());
    rows.forEach((r) => Object.assign(r, { isApproved: true, processedAt: t, processedBy: user.id, comment: comment || null }));
    const current = handlerById(mine[0].approvalHandlerId).step;
    const next = approvalSteps(b.roomId).find((s) => s.order > current.order);
    if (next) addStepRows(b, next);
    else {
      b.status = B.Approved;
      autoCancelConflicts(b);
      notify(b.createdBy, { title: 'Phiếu đã được duyệt', content: b.content, code: 'BOOKING_FINISH_APPROVED' });
      b.participants.forEach((p) => notify(p.userId, { title: 'Cuộc họp đã được duyệt', content: b.content, code: 'BOOKING_PARTICIPANT_APPROVED' }));
    }
    return true;
  }

  function rejectOne(b, user, comment) {
    const mine = b.approvals.filter((a) => handlerById(a.approvalHandlerId)?.userId === user.id && a.isApproved === null);
    if (!mine.length || b.status !== B.Waiting) return false;
    const stepId = handlerById(mine[0].approvalHandlerId).step.id;
    const t = iso(new Date());
    b.approvals
      .filter((a) => handlerById(a.approvalHandlerId).step.id === stepId)
      .forEach((r) => Object.assign(r, { isApproved: false, processedAt: t, processedBy: user.id, comment: comment || null }));
    b.status = B.Rejected;
    notify(b.createdBy, { title: 'Phiếu bị từ chối', content: `${b.content}${comment ? ` · ${comment}` : ''}`, code: 'BOOKING_FINISH_REJECTED' });
    return true;
  }

  // ---- seed (today is the reference day) ---------------------------------------------------
  const khoa = u('khoa.nm');
  const nowMin = vnMinutes(new Date());
  const liveStart = Math.max(7 * 60 + 30, Math.floor((nowMin - 35) / 5) * 5);
  const live = newBooking({
    room: chuLai,
    creator: khoa,
    from: vnAt(0, Math.floor(liveStart / 60), liveStart % 60),
    to: vnAt(0, Math.floor((liveStart + 60) / 60), (liveStart + 60) % 60),
    content: 'Giao ban khối CNTT',
    participants: [{ user: 'ha.tt', host: true }, { user: 'khoa.nm', prepare: true }, { user: 'nam.lv' }],
    people: 6,
    serviceIds: [services.water.id],
  });
  startWorkflow(live);
  approveOne(live, u('ha.tt'), 'OK');
  approveOne(live, u('nam.lv'), null);

  const seriesGroup = uuid();
  const series = [0, 7, 14, 21, 28].map((offset) =>
    newBooking({
      room: chuLai,
      creator: khoa,
      groupId: seriesGroup,
      from: vnAt(offset, 14, 0),
      to: vnAt(offset, 15, 0),
      content: 'Review thiết kế ứng dụng HRM Mobile',
      participantText: '2 đại diện đối tác triển khai',
      participants: [
        { user: 'ha.tt', host: true },
        { user: 'khoa.nm', prepare: true },
        { user: 'nam.lv' },
        { user: 'anh.ph' },
        { user: 'lan.nt' },
        { user: 'bao.pq' },
      ],
      people: 8,
      serviceIds: [services.water.id, services.online.id],
      attachments: [
        { id: uuid(), type: 1, name: 'Agenda_HRM_Mobile.pdf', path: '/uploads/sample-agenda.pdf' },
        { id: uuid(), type: 2, name: 'https://figma.com/file/thaco-hrm', path: 'https://figma.com/file/thaco-hrm' },
      ],
    }),
  );
  series.forEach((b) => {
    startWorkflow(b);
    approveOne(b, u('ha.tt'), 'Đồng ý, nhớ mời đối tác');
    b.approvals.filter((a) => a.isApproved).forEach((a) => (a.processedAt = iso(vnAt(0, 8, 20))));
  });

  const erp = newBooking({ room: kyHa, creator: u('tung.bt'), from: vnAt(0, 8, 0), to: vnAt(0, 9, 0), content: 'Họp ERP', people: 5 });
  startWorkflow(erp);
  approveOne(erp, khoa, null);

  const iso9001 = newBooking({ room: nuiThanh, creator: u('lan.nt'), from: vnAt(0, 8, 30), to: vnAt(0, 11, 30), content: 'Đào tạo ISO 9001', people: 6 });
  startWorkflow(iso9001);
  approveOne(iso9001, khoa, null);

  const supplier = newBooking({ room: tamHiep, creator: u('lan.nt'), from: vnAt(1, 9, 0), to: vnAt(1, 10, 0), content: 'Làm việc với nhà cung cấp', people: 4 });
  startWorkflow(supplier);
  const warehouse = newBooking({ room: tamHiep, creator: u('bao.pq'), from: vnAt(1, 9, 30), to: vnAt(1, 10, 30), content: 'Họp dự án kho', people: 5 });
  startWorkflow(warehouse);

  const onboarding = newBooking({ room: kyHa, creator: u('lan.nt'), from: vnAt(2, 8, 0), to: vnAt(2, 11, 30), content: 'Đào tạo nhân viên mới', people: 45 });
  startWorkflow(onboarding);

  const budget = newBooking({ room: kyHa, creator: u('tung.bt'), from: vnAt(-1, 14, 0), to: vnAt(-1, 15, 30), content: 'Kiểm tra dự toán quý IV', people: 4 });
  startWorkflow(budget);
  approveOne(budget, khoa, 'Đồng ý');

  const weekly = newBooking({ room: truongHai, creator: khoa, from: vnAt(1, 8, 0), to: vnAt(1, 9, 0), content: 'Giao ban tuần khối văn phòng', people: 30 });
  startWorkflow(weekly);

  const rejected = newBooking({ room: kyHa, creator: khoa, from: vnAt(-3, 10, 0), to: vnAt(-3, 11, 0), content: 'Demo nội bộ', people: 4 });
  startWorkflow(rejected);
  rejectOne(rejected, u('lan.nt'), 'Phòng đã ưu tiên cho đào tạo');

  // ---- DTOs -------------------------------------------------------------------------------------
  function roomDto(r) {
    const area = areas.find((a) => a.id === r.areaId);
    return {
      id: r.id,
      name: r.name,
      code: r.code,
      code2: r.code2,
      numberOfSeats: r.numberOfSeats,
      priority: r.priority,
      areaId: r.areaId,
      areaName: area.name,
      isActive: r.isActive,
      openedAt: r.openedAt,
      closedAt: r.closedAt,
      createdAt: iso(new Date()),
      updatedAt: iso(new Date()),
      departmentId: r.departmentId,
      isDisableOverlappingTimes: r.isDisableOverlappingTimes,
      isDisableCrossLevelDepartment: r.isDisableCrossLevelDepartment,
      isDisableCrossLevelArea: r.isDisableCrossLevelArea,
      isDisableSubscriberCancel: r.isDisableSubscriberCancel,
      isSendEmailToApprover: r.isSendEmailToApprover,
      isDayLimited: r.isDayLimited,
      maxAdvanceRegistrationDays: r.maxAdvanceRegistrationDays,
      services: r.serviceIds.map((id) => Object.values(services).find((s) => s.id === id)),
      area: areaDto(area),
    };
  }

  const userDto = (id) => common.userDto(byId[id]);

  function bookingDto(b, { detail = false } = {}) {
    const room = rooms.find((r) => r.id === b.roomId);
    return {
      id: b.id,
      roomId: b.roomId,
      groupId: b.groupId,
      code: b.code,
      from: b.from,
      to: b.to,
      status: b.status,
      content: b.content,
      participant: b.participant,
      phoneNumber: b.phoneNumber,
      numberOfParticipants: b.numberOfParticipants,
      isConfidentialContent: b.isConfidentialContent,
      isSingleBooking: detail ? bookings.filter((x) => x.groupId === b.groupId).length === 1 : null,
      reason: b.reason,
      createdAt: b.createdAt,
      updatedAt: b.createdAt,
      updatedBy: null,
      user: userDto(b.createdBy),
      room: roomDto(room),
      services: b.serviceIds.map((id) => Object.values(services).find((s) => s.id === id)),
      attachments: b.attachments.map((a) => ({ ...a, bookingId: b.id, createdAt: b.createdAt })),
      participants: b.participants.map((p) => ({ ...p, bookingId: b.id, user: userDto(p.userId) })),
      approvalHistory: null,
    };
  }

  function approvalRowDto(b, row, { withStep = true, aggregate } = {}) {
    const h = handlerById(row.approvalHandlerId);
    const booking = aggregate ?? bookingDto(b);
    return {
      id: row.id,
      approvalHandlerId: row.approvalHandlerId,
      isApproved: row.isApproved,
      processedAt: row.processedAt,
      processedBy: row.processedBy,
      comment: row.comment,
      booking,
      approvalHandler: {
        id: h.id,
        stepId: h.stepId,
        userId: h.userId,
        user: userDto(h.userId),
        approvalStep: withStep ? { id: h.step.id, name: h.step.name, workflowId: h.step.workflowId, order: h.step.order, actionType: h.step.actionType, isActive: true } : null,
      },
      status: row.isApproved === null ? 'Pending' : row.isApproved ? 'Approved' : 'Rejected',
    };
  }

  function workflowDto(w) {
    return {
      id: w.id,
      name: w.name,
      roomId: w.roomId,
      description: w.description,
      isActive: w.isActive,
      approvalSteps: w.steps.map((s) => ({
        id: s.id,
        name: s.name,
        workflowId: s.workflowId,
        order: s.order,
        actionType: s.actionType,
        isActive: s.isActive,
        approvalHandlers: s.handlers.map((h) => ({ id: h.id, stepId: h.stepId, userId: h.userId, user: userDto(h.userId) })),
      })),
      room: roomDto(rooms.find((r) => r.id === w.roomId)),
    };
  }

  // ---- validation (mirrors CreateMultiDayBookingCommandHandler) -------------------------------
  function validateWindow(room, from, to, { excludeGroupId, excludeId } = {}) {
    if (vnMinutes(from) >= vnMinutes(to)) throw bad('START_TIME_BEFORE_END_TIME');
    if (vnDayKey(from) > vnDayKey(to)) throw bad('FROM_DATE_BEFORE_TO_DATE');
    if (vnMinutes(from) < parseHm(room.openedAt) || vnMinutes(to) > parseHm(room.closedAt)) throw conflict('BOOKING_OUTSIDE_HOURS');
    if (room.isDayLimited) {
      const limit = new Date(Date.now() + room.maxAdvanceRegistrationDays * DAY);
      if (vnDayKey(to) > vnDayKey(limit)) throw bad('BOOKING_LIMIT_DAY');
    }
    if (room.isDisableOverlappingTimes) {
      const clash = bookings.some(
        (b) =>
          b.roomId === room.id &&
          ![B.Rejected, B.Canceled].includes(b.status) &&
          b.groupId !== excludeGroupId &&
          b.id !== excludeId &&
          vnDayKey(b.from) <= vnDayKey(to) &&
          vnDayKey(b.to) >= vnDayKey(from) &&
          vnMinutes(b.from) < vnMinutes(to) &&
          vnMinutes(b.to) > vnMinutes(from),
      );
      if (clash) throw conflict('BOOKING_CONFLICT');
    }
  }

  function validateCrossLevel(room, user) {
    if (!room.isDisableCrossLevelArea && !room.isDisableCrossLevelDepartment) return;
    const userDept = deptByKey[user.dept].id;
    if (room.isDisableCrossLevelDepartment && !isDescendantOrSelf(userDept, [room.departmentId])) throw conflict('BOOKING_CROSS_LEVEL');
    const area = areas.find((a) => a.id === room.areaId);
    if (!isDescendantOrSelf(userDept, area.departmentIds)) throw conflict('BOOKING_CROSS_LEVEL');
  }

  function sessionDates(from, to, recurrenceType, interval) {
    const step = Math.max(1, recurrenceType || 1) * Math.max(1, interval || 1);
    const dates = [];
    const start = new Date(`${vnDayKey(from)}T00:00:00Z`);
    const end = new Date(`${vnDayKey(to)}T00:00:00Z`);
    for (let d = start; d <= end; d = new Date(d.getTime() + step * DAY)) {
      if (d.getUTCDay() !== 0 || d.getTime() === end.getTime()) dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }

  const atVn = (dayKey, minutes) => new Date(new Date(`${dayKey}T00:00:00Z`).getTime() - VN_OFFSET + minutes * 60000);

  function readBookingForm(form) {
    const files = filesOf(form, 'attachments');
    if (files.length > 5) throw bad('LIMIT_5_ATTACHMENTS');
    if (files.some((f) => f.size > MAX_FILE)) throw bad('EXCEED_10MB_LIMIT');
    const links = fieldsOf(form, 'links').filter((l) => /^https?:\/\//.test(l));
    const participants = indexedObjects(form, 'participants').map((p) => ({ id: uuid(), userId: p.userid, isHost: p.ishost === 'true', isPrepareContent: p.ispreparecontent === 'true' }));
    return {
      roomId: fieldOf(form, 'roomId'),
      from: fieldOf(form, 'from'),
      to: fieldOf(form, 'to'),
      content: fieldOf(form, 'content') || null,
      participant: fieldOf(form, 'participant') || null,
      phoneNumber: fieldOf(form, 'phoneNumber') || null,
      numberOfParticipants: Number(fieldOf(form, 'numberOfParticipants') || 0),
      isConfidentialContent: fieldOf(form, 'isConfidentialContent') === 'true',
      recurrenceType: Number(fieldOf(form, 'recurrenceType') || 1),
      recurrenceInterval: Number(fieldOf(form, 'recurrenceInterval') || 1),
      isUpdateSingleDay: fieldOf(form, 'isUpdateSingleDay') === 'true',
      serviceIds: fieldsOf(form, 'serviceIds'),
      keepAttachmentIds: fieldsOf(form, 'attachmentIds'),
      attachments: [
        ...files.map((f) => ({ id: f.id, type: 1, name: f.filename, path: `/uploads/${f.storedAs}` })),
        ...links.map((l) => ({ id: uuid(), type: 2, name: l, path: l })),
      ],
      participants,
    };
  }

  const findBooking = (id) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) throw notFound('BOOKING_NOT_FOUND');
    return b;
  };

  const isApproverOf = (b, user) => b.approvals.some((a) => handlerById(a.approvalHandlerId)?.userId === user.id);

  function myRows(user) {
    return bookings.flatMap((b) => b.approvals.filter((a) => handlerById(a.approvalHandlerId)?.userId === user.id).map((row) => ({ b, row })));
  }

  // Auto-finish job: waiting bookings whose time has passed become Finished.
  function runJobs() {
    const t = Date.now();
    bookings.filter((b) => b.status === B.Waiting && new Date(b.to).getTime() < t).forEach((b) => (b.status = B.Finished));
  }

  const inWindow = (b, query) => {
    const from = query.get('fromDate') ? new Date(query.get('fromDate')) : null;
    const to = query.get('toDate') ? new Date(query.get('toDate')) : null;
    if (from && new Date(b.to) <= from) return false;
    if (to && new Date(b.from) >= to) return false;
    return true;
  };

  const roomFilter = (b, query) => {
    const room = rooms.find((r) => r.id === b.roomId);
    if (query.get('areaId') && room.areaId !== query.get('areaId')) return false;
    if (query.get('departmentId') && room.departmentId !== query.get('departmentId')) return false;
    if (query.get('status') && Number(query.get('status')) !== b.status) return false;
    const s = (query.get('search') || '').toLowerCase();
    if (s && !(b.content || '').toLowerCase().includes(s) && !b.code.toLowerCase().includes(s)) return false;
    return true;
  };

  notify(khoa.id, { title: 'Có phiếu cần duyệt', content: 'Làm việc với nhà cung cấp · Tam Hiệp', code: 'NEW_BOOKING' });
  notify(khoa.id, { title: 'Cấp 1 đã duyệt', content: 'Review thiết kế ứng dụng HRM Mobile đang chờ cấp 2.', code: 'BOOKING_APPROVED' });

  return [
    [
      'GET',
      '/api/areas',
      ({ query }) =>
        paginate(
          areas.map((a) => ({ ...areaDto(a), departments: a.departmentIds.map((id) => deptDto(allDepts.find((d) => d.id === id))) })),
          query,
        ),
    ],
    ['GET', '/api/departments/get-departments-has-room', ({ query }) => {
      const areaId = query.get('areaId');
      const ids = [...new Set(rooms.filter((r) => !areaId || r.areaId === areaId).map((r) => r.departmentId))];
      return ids.map((id) => deptDto(allDepts.find((d) => d.id === id)));
    }],
    ['GET', '/api/departments', ({ query }) => paginate(allDepts.map(deptDto), query)],
    ['GET', '/api/services', ({ query }) => paginate(Object.values(services), query)],
    [
      'GET',
      '/api/rooms/get-all-rooms',
      ({ query }) =>
        rooms
          .filter((r) => (!query.get('areaId') || r.areaId === query.get('areaId')) && (!query.get('departmentId') || r.departmentId === query.get('departmentId')))
          .map(roomDto),
    ],
    [
      'GET',
      '/api/rooms/get-available-rooms',
      ({ query, user }) => {
        const start = query.get('startTime');
        const end = query.get('endTime');
        return rooms
          .filter((r) => !query.get('areaId') || r.areaId === query.get('areaId'))
          .filter((r) => (workflowOf(r.id)?.steps ?? []).some((s) => s.handlers.some((h) => h.userId === user.id)))
          .filter(
            (r) =>
              !start ||
              !bookings.some((b) => b.roomId === r.id && [B.Approved, B.Waiting].includes(b.status) && overlaps(b, { from: start, to: end })),
          )
          .map(roomDto);
      },
    ],
    ['GET', '/api/approvalworkflows', ({ query }) => paginate(workflows.map(workflowDto), query)],
    ['GET', '/api/approvalsteps/workflow/:id', ({ params }) => (workflows.find((w) => w.id === params.id) ? workflowDto(workflows.find((w) => w.id === params.id)).approvalSteps : [])],
    [
      'GET',
      '/api/dashboard/approval-stats',
      ({ user }) => {
        runJobs();
        const rows = myRows(user);
        const pendingGroups = new Set(rows.filter(({ b, row }) => row.isApproved === null && b.status === B.Waiting).map(({ b }) => b.groupId));
        const doneGroups = new Set(rows.filter(({ row }) => row.isApproved !== null).map(({ b }) => b.groupId));
        const today = vnDayKey(new Date());
        return {
          pendingApprovalsForUser: pendingGroups.size,
          pendingBookingsOfUser: bookings.filter((b) => b.createdBy === user.id && b.status === B.Waiting).length,
          completedApprovalsOfUser: doneGroups.size,
          totalBookingsOfUser: bookings.filter((b) => b.createdBy === user.id).length,
          totalAll: bookings.length,
          bookingsToday: bookings.filter((b) => vnDayKey(b.from) === today).length,
        };
      },
    ],
    [
      'GET',
      '/api/bookings/get-all-bookings',
      ({ query }) => {
        runJobs();
        return bookings.filter((b) => inWindow(b, query) && roomFilter(b, query)).map((b) => bookingDto(b));
      },
    ],
    [
      'GET',
      '/api/bookings/get-my-bookings',
      ({ query, user }) => {
        runJobs();
        const list = bookings
          .filter((b) => b.createdBy === user.id && inWindow(b, query) && roomFilter(b, query))
          .sort((a, b) => a.from.localeCompare(b.from));
        return paginate(list.map((b) => bookingDto(b)), query);
      },
    ],
    [
      'POST',
      '/api/bookings/multi-day',
      ({ form, user }) => {
        const input = readBookingForm(form);
        if (!input.roomId) throw bad('ROOM_ID_REQUIRED');
        if (!input.from || !input.to) throw bad('FROM_TO_DATE_REQUIRED');
        const room = rooms.find((r) => r.id === input.roomId);
        if (!room) throw notFound('BOOKING_NOT_FOUND');
        validateWindow(room, input.from, input.to);
        validateCrossLevel(room, user);
        const groupId = uuid();
        const startMin = vnMinutes(input.from);
        const endMin = vnMinutes(input.to);
        const created = sessionDates(input.from, input.to, input.recurrenceType, input.recurrenceInterval).map((day) => {
          const b = newBooking({
            room,
            creator: user,
            groupId,
            from: atVn(day, startMin),
            to: atVn(day, endMin),
            content: input.content,
            participantText: input.participant,
            people: input.numberOfParticipants,
            serviceIds: input.serviceIds.filter((id) => room.serviceIds.includes(id)),
            attachments: input.attachments,
            confidential: input.isConfidentialContent,
          });
          b.participants = input.participants;
          b.phoneNumber = input.phoneNumber;
          startWorkflow(b);
          return b;
        });
        return created.map((b) => bookingDto(b));
      },
    ],
    [
      'PUT',
      '/api/bookings/:id/group/:groupId',
      ({ params, form, user }) => {
        const input = readBookingForm(form);
        const anchor = findBooking(params.id);
        const targets = input.isUpdateSingleDay ? [anchor] : bookings.filter((b) => b.groupId === params.groupId && b.status === B.Waiting);
        if (targets.some((b) => b.status !== B.Waiting)) throw conflict('BOOKING_HAS_BEEN_APPROVED_AT_HIGHER_LEVEL');
        const room = rooms.find((r) => r.id === (input.roomId || anchor.roomId));
        const startMin = vnMinutes(input.from || anchor.from);
        const endMin = vnMinutes(input.to || anchor.to);
        targets.forEach((b) => {
          const day = input.isUpdateSingleDay && input.from ? vnDayKey(input.from) : vnDayKey(b.from);
          const from = atVn(day, startMin);
          const to = atVn(day, endMin);
          validateWindow(room, from, to, { excludeGroupId: b.groupId });
          const roomChanged = room.id !== b.roomId;
          Object.assign(b, {
            roomId: room.id,
            from: iso(from),
            to: iso(to),
            content: input.content,
            participant: input.participant,
            phoneNumber: input.phoneNumber,
            numberOfParticipants: input.numberOfParticipants,
            isConfidentialContent: input.isConfidentialContent,
            serviceIds: input.serviceIds,
            attachments: [...b.attachments.filter((a) => input.keepAttachmentIds.includes(a.id)), ...input.attachments],
            participants: input.participants,
          });
          if (roomChanged) {
            b.approvals = [];
            startWorkflow(b);
          }
        });
        void user;
        return bookingDto(anchor, { detail: true });
      },
    ],
    [
      'PUT',
      '/api/bookings/:id/cancel',
      ({ params, body, user }) => {
        const b = findBooking(params.id);
        const room = rooms.find((r) => r.id === b.roomId);
        if (room.isDisableSubscriberCancel && b.status === B.Approved && !isApproverOf(b, user)) throw conflict('BOOKING_DISABLE_CANCEL');
        b.status = B.Canceled;
        b.reason = body?.reason || null;
        if (b.createdBy !== user.id) notify(b.createdBy, { title: 'Phiếu bị hủy', content: b.content, code: 'BOOKING_CANCELLATION' });
        return undefined;
      },
    ],
    [
      'PUT',
      '/api/bookings/:id/extend',
      ({ params, body }) => {
        const b = findBooking(params.id);
        const current = new Date(body.curentTime);
        const sinceEnd = (current - new Date(b.to)) / 60000;
        const sinceStart = (current - new Date(b.from)) / 60000;
        if (!(sinceEnd <= 30 && sinceStart >= 0)) throw bad('NOT_TIME_FOR_EXTENSION');
        if (vnDayKey(body.newEndTime) > vnDayKey(b.to)) throw bad('ONLY_EXTEND_TODAY');
        if (vnMinutes(b.to) > vnMinutes(body.newEndTime)) throw bad('NEW_TIME_MUST_LATER_END_TIME');
        const room = rooms.find((r) => r.id === b.roomId);
        validateWindow(room, b.from, body.newEndTime, { excludeId: b.id });
        const clash = bookings.some((o) => o.id !== b.id && o.roomId === b.roomId && [B.Approved].includes(o.status) && overlaps(o, { from: b.to, to: body.newEndTime }));
        if (clash) throw conflict('BOOKING_CONFLICT');
        b.to = iso(new Date(body.newEndTime));
        return bookingDto(b, { detail: true });
      },
    ],
    [
      'PUT',
      '/api/bookings/:id/complete',
      ({ params, body }) => {
        const b = findBooking(params.id);
        if (b.status !== B.Approved) throw bad('BOOKING_NOT_APPROVED');
        if (new Date(b.from) > new Date(body.newEndTime)) throw bad('FINISH_TIME_LATER_START_TIME');
        if (new Date(b.to) > new Date(body.newEndTime)) b.to = iso(new Date(body.newEndTime));
        b.status = B.Finished;
        return bookingDto(b, { detail: true });
      },
    ],
    ['GET', '/api/bookings/:id/attachments/:aid/download', ({ params }) => {
      const b = findBooking(params.id);
      const a = b.attachments.find((x) => x.id === params.aid);
      if (!a) throw notFound('ATTACHMENT_NOT_FOUND');
      if (a.type === 2) throw bad('CANNOT_DOWNLOAD_LINK');
      return { name: a.name };
    }],
    ['GET', '/api/bookings/:id', ({ params }) => {
      runJobs();
      return bookingDto(findBooking(params.id), { detail: true });
    }],
    // ---- approvals ----
    [
      'GET',
      '/api/bookingapprovals/my-approvals',
      ({ query, user }) => {
        runJobs();
        const status = Number(query.get('status') ?? 0);
        let rows = myRows(user);
        if (status === 1) rows = rows.filter(({ row }) => row.isApproved === true);
        if (status === 2) rows = rows.filter(({ row }) => row.isApproved === false);
        if (status === 3) rows = rows.filter(({ row, b }) => row.isApproved === null && b.status === B.Waiting);
        if (status === 4) rows = rows.filter(({ row }) => row.isApproved !== null);
        const search = (query.get('search') || '').toLowerCase();
        if (search) rows = rows.filter(({ b }) => (b.content || '').toLowerCase().includes(search) || b.code.toLowerCase().includes(search));
        const groups = new Map();
        rows.forEach((entry) => {
          const list = groups.get(entry.b.groupId) || [];
          list.push(entry);
          groups.set(entry.b.groupId, list);
        });
        const aggregated = [...groups.values()].map((list) => {
          const rep = list.sort((a, b) => a.b.from.localeCompare(b.b.from))[0];
          const all = bookings.filter((x) => x.groupId === rep.b.groupId);
          const minFrom = all.map((x) => x.from).sort()[0];
          const maxTo = all.map((x) => x.to).sort().slice(-1)[0];
          const dto = bookingDto(rep.b);
          return approvalRowDto(rep.b, rep.row, { withStep: false, aggregate: { ...dto, from: minFrom, to: maxTo, services: null, attachments: null, participants: null } });
        });
        aggregated.sort((a, b) => b.booking.createdAt.localeCompare(a.booking.createdAt));
        return paginate(aggregated, query);
      },
    ],
    ['GET', '/api/bookingapprovals/booking/:id/pending', ({ params }) => findBooking(params.id).approvals.filter((a) => a.isApproved === null).map((row) => approvalRowDto(findBooking(params.id), row))],
    ['GET', '/api/bookingapprovals/booking/:id', ({ params }) => findBooking(params.id).approvals.map((row) => approvalRowDto(findBooking(params.id), row))],
    [
      'POST',
      '/api/bookingapprovals/booking/:id/approve',
      ({ params, body, user }) => {
        const b = findBooking(params.id);
        const targets = body.isUpdateSingleDay ? [b] : bookings.filter((x) => x.groupId === b.groupId && x.status === B.Waiting);
        if (body.roomId && body.roomId !== b.roomId) {
          const room = rooms.find((r) => r.id === body.roomId);
          targets.forEach((t) => validateWindow(room, t.from, t.to, { excludeGroupId: b.groupId }));
          targets.forEach((t) => (t.roomId = room.id));
        }
        if (body.numberOfParticipants) targets.forEach((t) => (t.numberOfParticipants = body.numberOfParticipants));
        const done = targets.map((t) => approveOne(t, user, body.comment)).some(Boolean);
        if (!done) throw bad('BOOKING_APPROVAL_HANDLER_NOT_FOUND');
        return true;
      },
    ],
    [
      'POST',
      '/api/bookingapprovals/booking/:id/reject',
      ({ params, body, user }) => {
        const b = findBooking(params.id);
        const targets = body.isUpdateSingleDay ? [b] : bookings.filter((x) => x.groupId === b.groupId && x.status === B.Waiting);
        const done = targets.map((t) => rejectOne(t, user, body.comment)).some(Boolean);
        if (!done) throw bad('BOOKING_APPROVAL_HANDLER_NOT_FOUND');
        return true;
      },
    ],
    [
      'POST',
      '/api/bookingapprovals/booking/:id/undo-approval',
      ({ params, body, user }) => {
        const b = findBooking(params.id);
        if (new Date(b.to) < new Date(body.curentTime)) throw bad('BOOKING_HAS_BEEN_FINISH');
        const targets = body.isUpdateSingleDay ? [b] : bookings.filter((x) => x.groupId === b.groupId && ![B.Canceled, B.Finished].includes(x.status));
        targets.forEach((t) => {
          const mine = t.approvals.find((a) => handlerById(a.approvalHandlerId)?.userId === user.id && a.isApproved !== null);
          if (!mine) return;
          const myOrder = handlerById(mine.approvalHandlerId).step.order;
          const higherApproved = t.approvals.some((a) => handlerById(a.approvalHandlerId).step.order > myOrder && a.isApproved !== null);
          if (higherApproved) throw conflict('BOOKING_HAS_BEEN_APPROVED_AT_HIGHER_LEVEL');
          const stepId = handlerById(mine.approvalHandlerId).step.id;
          t.approvals = t.approvals.filter((a) => handlerById(a.approvalHandlerId).step.order <= myOrder);
          t.approvals.filter((a) => handlerById(a.approvalHandlerId).step.id === stepId).forEach((a) => Object.assign(a, { isApproved: null, processedAt: null, processedBy: null, comment: null }));
          t.status = B.Waiting;
          notify(t.createdBy, { title: 'Hoàn tác duyệt', content: t.content, code: 'UNDO_APPROVAL_TO_CREATOR' });
        });
        return true;
      },
    ],
    [
      'POST',
      '/api/bookingapprovals/booking-group/approve',
      ({ body, user }) => {
        if (!body.bookingGroupIds?.length) throw bad('BOOKING_GROUP_ID_REQUIRED');
        bookings.filter((b) => body.bookingGroupIds.includes(b.groupId) && b.status === B.Waiting).forEach((b) => approveOne(b, user, body.comment));
        return true;
      },
    ],
    [
      'POST',
      '/api/bookingapprovals/booking-group/reject',
      ({ body, user }) => {
        if (!body.bookingGroupIds?.length) throw bad('BOOKING_GROUP_ID_REQUIRED');
        bookings.filter((b) => body.bookingGroupIds.includes(b.groupId) && b.status === B.Waiting).forEach((b) => rejectOne(b, user, body.comment));
        return true;
      },
    ],
  ];
}

module.exports = { createRoomService };
