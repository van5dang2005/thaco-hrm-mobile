/** UserDto of thaco_be_ql_buu_pham (flat department fields). */
export type ParcelUser = {
  id: string;
  username: string;
  email: string;
  fullname?: string | null;
  employeeCode?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  unitName?: string | null;
  unitFullPathName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  jobTitleName?: string | null;
  positionName?: string | null;
  roles?: string[] | null;
};

export type RoomArea = { id: string; name: string; code: string; isActive: boolean };

export type RoomDepartment = {
  id: string;
  name?: string | null;
  code?: string | null;
  parentId?: string | null;
  level?: number | null;
  isActive?: boolean | null;
  areas?: RoomArea[] | null;
};

/** UserDto of thaco_be_ql_phong_hop (departments[] with areas, job titles, positions). */
export type RoomUser = {
  id: string;
  username: string;
  email: string;
  fullname?: string | null;
  employeeCode?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  unitName?: string | null;
  roles?: string[] | null;
  departments?: RoomDepartment[] | null;
  jobTitles?: { id: string; name?: string | null }[] | null;
  positions?: { id: string; name?: string | null }[] | null;
};

/** Ids are GUID strings; the two services may differ in casing. */
export function sameId(a?: string | null, b?: string | null) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/** "Nguyễn Minh Khoa" -> "Khoa" for greetings. */
export function givenName(fullname?: string | null) {
  const words = (fullname ?? '').trim().split(/\s+/).filter(Boolean);
  return words[words.length - 1] ?? '';
}

/** Department line for a person, from whichever service shape we have. */
export function departmentLabel(user?: Partial<ParcelUser & RoomUser> | null) {
  if (!user) return '';
  return user.departmentName ?? user.departments?.[0]?.name ?? user.unitName ?? '';
}

/** Shape used by PersonRow / UserPicker. */
export type PersonOf<T> = { id: string; name: string; code?: string | null; department?: string | null; avatarUrl?: string | null; user: T };

export function roomPerson(user: RoomUser): PersonOf<RoomUser> {
  return {
    id: user.id,
    name: user.fullname ?? user.username,
    code: user.employeeCode,
    department: user.departments?.[0]?.name ?? user.unitName,
    avatarUrl: user.avatarUrl,
    user,
  };
}

export function parcelPerson(user: ParcelUser): PersonOf<ParcelUser> {
  return {
    id: user.id,
    name: user.fullname ?? user.username,
    code: user.employeeCode,
    department: user.departmentName ?? user.unitName,
    avatarUrl: user.avatarUrl,
    user,
  };
}
