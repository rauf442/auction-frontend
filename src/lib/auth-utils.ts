// frontend/src/lib/auth-utils.ts

// Get current user from localStorage
const getCurrentUser = (): any => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
  }
  return null;
};

// Check if current user is super admin
export const isSuperAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'super_admin';
};

// Get current user role
export const getCurrentUserRole = (): string | null => {
  const user = getCurrentUser();
  return user?.role || null;
};

// Check if user has admin privileges (super_admin or admin)
export const hasAdminAccess = (): boolean => {
  const role = getCurrentUserRole();
  const user = getCurrentUser();
  console.log('Auth check - User object:', user);
  console.log('Auth check - Current user role:', role);
  console.log('Auth check - Has admin access:', (role === 'super_admin' || role === 'admin'));
  return role === 'super_admin' || role === 'admin';
};
