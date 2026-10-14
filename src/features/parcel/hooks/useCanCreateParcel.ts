import { useAccessibleDepartments } from './useAccessibleDepartments';

/**
 * Whether "Thêm bưu phẩm" makes sense: the server lets a caller create parcels only for units in its
 * department scope (DEPARTMENT_ACCESS_DENIED otherwise), and `departments/accessible` is empty
 * exactly when that scope is.
 */
export function useCanCreateParcel() {
  const departments = useAccessibleDepartments();
  return !!departments.data?.length;
}
