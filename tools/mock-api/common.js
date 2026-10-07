// Endpoints shared by both back-ends: auth, users, notifications.
const crypto = require('node:crypto');
const { uuid, iso, HttpError, paginate } = require('./lib');

const PASSWORD = process.env.MOCK_PASSWORD || '123456';
const ACCESS_TTL_MS = Number(process.env.MOCK_ACCESS_TTL_MS || 15 * 60 * 1000);

/** Deterministic GUID per (service, key) so ids differ between the two services, like production. */
function stableId(service, key) {
  const h = crypto.createHash('md5').update(`${service}:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const DEPARTMENTS = [
  { key: 'cntt', name: 'Ban Công nghệ thông tin', code: 'CNTT', requireApproval: false },
  { key: 'hcns', name: 'Phòng Hành chính', code: 'HC', requireApproval: true },
  { key: 'tc', name: 'Ban Tài chính', code: 'TC', requireApproval: false },
  { key: 'letan', name: 'Lễ tân Tòa A', code: 'LTA', requireApproval: false },
  { key: 'ns', name: 'Phòng Nhân sự', code: 'NS', requireApproval: false },
];

const PEOPLE = [
  { username: 'khoa.nm', fullname: 'Nguyễn Minh Khoa', employeeCode: 'TC-048213', dept: 'cntt', phone: '0905 213 048', jobTitle: 'Chuyên viên phát triển phần mềm', position: 'Chuyên viên' },
  { username: 'ha.tt', fullname: 'Trần Thu Hà', employeeCode: 'TC-020114', dept: 'cntt', phone: '0905 114 020', jobTitle: 'Trưởng ban CNTT', position: 'Trưởng ban' },
  { username: 'nam.lv', fullname: 'Lê Văn Nam', employeeCode: 'TC-031877', dept: 'cntt', phone: '0905 877 031', jobTitle: 'Chuyên viên hạ tầng', position: 'Chuyên viên' },
  { username: 'anh.ph', fullname: 'Phạm Hoàng Anh', employeeCode: 'TC-027540', dept: 'hcns', phone: '0905 540 027', jobTitle: 'Chuyên viên hành chính', position: 'Chuyên viên' },
  { username: 'nhung.vh', fullname: 'Võ Hồng Nhung', employeeCode: 'TC-015502', dept: 'letan', phone: '0905 502 015', jobTitle: 'Lễ tân', position: 'Nhân viên', reception: true },
  { username: 'tung.bt', fullname: 'Bùi Thanh Tùng', employeeCode: 'TC-039902', dept: 'tc', phone: '0905 902 039', jobTitle: 'Kế toán tổng hợp', position: 'Chuyên viên' },
  { username: 'lan.nt', fullname: 'Nguyễn Thị Lan', employeeCode: 'TC-041120', dept: 'ns', phone: '0905 120 041', jobTitle: 'Chuyên viên tuyển dụng', position: 'Chuyên viên' },
  { username: 'bao.pq', fullname: 'Phạm Quốc Bảo', employeeCode: 'TC-052118', dept: 'tc', phone: '0905 118 052', jobTitle: 'Kế toán', position: 'Nhân viên' },
  { username: 'admin', fullname: 'Quản trị hệ thống', employeeCode: 'TC-000001', dept: 'cntt', phone: '', jobTitle: 'Quản trị', position: 'Quản trị', roles: ['Administrator'], reception: true },
];

function createCommon(service) {
  const departments = DEPARTMENTS.map((d) => ({ ...d, id: stableId(service, `dept:${d.key}`) }));
  const deptByKey = Object.fromEntries(departments.map((d) => [d.key, d]));
  const people = PEOPLE.map((p) => ({ ...p, id: stableId(service, `user:${p.username}`), email: `${p.username}@thaco.com.vn`, roles: p.roles || [] }));
  const byUsername = Object.fromEntries(people.map((p) => [p.username, p]));
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  const tokens = new Map(); // token -> { username, expiresAt }
  const refreshTokens = new Map(); // refreshToken -> username
  const notifications = new Map(); // userId -> NotificationDto[]

  function issue(username) {
    const token = `mock.${service}.${username}.${uuid()}`;
    const refreshToken = `refresh.${service}.${uuid()}`;
    tokens.set(token, { username, expiresAt: Date.now() + ACCESS_TTL_MS });
    refreshTokens.set(refreshToken, username);
    const person = byUsername[username];
    return { token, refreshToken, username, email: person.email, roles: person.roles };
  }

  function authenticate(header) {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const entry = token && tokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return byUsername[entry.username];
  }

  let deptDecorator = null;
  /** Room service: lets the room mock attach parentId / areas to a user's departments. */
  const setDepartmentDecorator = (fn) => {
    deptDecorator = fn;
  };

  /** Parcel UserDto (flat) or room UserDto (departments[] with areas). */
  function userDto(person) {
    if (!person) return null;
    const dept = deptByKey[person.dept];
    const base = {
      id: person.id,
      username: person.username,
      email: person.email,
      fullname: person.fullname,
      employeeCode: person.employeeCode,
      avatarUrl: null,
      phoneNumber: person.phone,
      unitName: 'THACO AUTO',
      roles: person.roles,
    };
    if (service === 'parcel') {
      return {
        ...base,
        unitFullPathName: `THACO / THACO AUTO / ${dept.name}`,
        departmentId: dept.id,
        departmentName: dept.name,
        jobTitleName: person.jobTitle,
        positionName: person.position,
      };
    }
    return {
      ...base,
      departments: [{ id: dept.id, name: dept.name, code: dept.code, parentId: null, level: 3, isActive: true, areas: [], ...(deptDecorator ? deptDecorator(dept.id) : {}) }],
      jobTitles: [{ id: stableId(service, `jt:${person.jobTitle}`), name: person.jobTitle }],
      positions: [{ id: stableId(service, `pos:${person.position}`), name: person.position }],
    };
  }

  function notify(userId, { title, content, code }) {
    const list = notifications.get(userId) || [];
    list.unshift({ id: uuid(), receiverId: userId, type: 2, title, content, code, isRead: false, status: 1, createdAt: iso(new Date()) });
    notifications.set(userId, list);
  }

  const mine = (user) => notifications.get(user.id) || [];

  function routes() {
    return [
      [
        'POST',
        '/api/auth/login',
        ({ body }) => {
          const username = String(body?.username || '').trim().toLowerCase();
          const person = byUsername[username] || people.find((p) => p.employeeCode.toLowerCase() === username);
          if (!person || body?.password !== PASSWORD) {
            return { __status: 401, body: { message: 'Invalid username or password.', code: 401, errorCode: 'INVALID_USER_NAME_OR_PASS', data: null } };
          }
          return issue(person.username);
        },
        { public: true },
      ],
      [
        'POST',
        '/api/auth/refresh-token',
        ({ body }) => {
          const username = refreshTokens.get(body?.refreshToken);
          if (!username) {
            return { __status: 401, body: { message: 'Failed to refresh token.', code: 401, errorCode: 'EXPIRED_REFRESH_TOKEN', data: null } };
          }
          refreshTokens.delete(body.refreshToken);
          return issue(username);
        },
        { public: true },
      ],
      ['GET', '/api/users/me', ({ user }) => userDto(user)],
      [
        'GET',
        '/api/users',
        ({ query }) => {
          const keyword = (query.get('searchKeyword') || '').toLowerCase();
          const matches = people.filter(
            (p) => !keyword || p.fullname.toLowerCase().includes(keyword) || p.employeeCode.toLowerCase().includes(keyword) || p.username.includes(keyword),
          );
          return paginate(matches.map((p) => userDto(p)), query);
        },
      ],
      ['GET', '/api/notifications', ({ user, query }) => paginate(mine(user), query)],
      ['GET', '/api/notifications/unread', ({ user }) => mine(user).filter((n) => !n.isRead)],
      ['GET', '/api/notifications/total-unread', ({ user }) => mine(user).filter((n) => !n.isRead).length],
      [
        'PUT',
        '/api/notifications/bulk-seen',
        ({ user }) => {
          mine(user).forEach((n) => (n.isRead = true));
          return true;
        },
      ],
      [
        'PUT',
        '/api/notifications/:id/mark-as-read',
        ({ user, params }) => {
          const n = mine(user).find((x) => x.id === params.id);
          if (!n) throw new HttpError(404, 'DATA_NOT_FOUND');
          n.isRead = true;
          return true;
        },
      ],
      [
        'DELETE',
        '/api/notifications/bulk-delete',
        ({ user }) => {
          notifications.set(user.id, []);
          return true;
        },
      ],
      [
        'DELETE',
        '/api/notifications/:id',
        ({ user, params }) => {
          notifications.set(user.id, mine(user).filter((n) => n.id !== params.id));
          return true;
        },
      ],
    ];
  }

  return { service, departments, deptByKey, people, byUsername, byId, authenticate, userDto, notify, routes, setDepartmentDecorator, stableId: (k) => stableId(service, k) };
}

module.exports = { createCommon, DEPARTMENTS };
