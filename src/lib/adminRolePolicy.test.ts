import { describe, expect, it } from 'vitest';

import {
  canAssignAdminRole,
  canManageAdminTarget,
  getAssignableAdminRoles,
  isPrivilegedAdminRole,
} from './adminRolePolicy';

describe('adminRolePolicy', () => {
  it('limits admin assignment to gestor and usuario while superadmin can assign every role', () => {
    expect(getAssignableAdminRoles('admin')).toEqual(['usuario', 'gestor']);
    expect(getAssignableAdminRoles('superadmin')).toEqual([
      'usuario',
      'gestor',
      'admin',
      'superadmin',
    ]);
    expect(canAssignAdminRole('admin', 'admin')).toBe(false);
    expect(canAssignAdminRole('admin', 'superadmin')).toBe(false);
    expect(canAssignAdminRole('superadmin', 'superadmin')).toBe(true);
  });

  it('treats admin and superadmin as privileged targets', () => {
    expect(isPrivilegedAdminRole('admin')).toBe(true);
    expect(isPrivilegedAdminRole('superadmin')).toBe(true);
    expect(isPrivilegedAdminRole('gestor')).toBe(false);
    expect(canManageAdminTarget('admin', 'admin')).toBe(false);
    expect(canManageAdminTarget('admin', 'gestor')).toBe(true);
    expect(canManageAdminTarget('superadmin', 'admin')).toBe(true);
  });
});
