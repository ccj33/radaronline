import { hasSupabaseAdminConfig } from '../../shared/persistence/supabase-admin.js';
import { InMemoryUsersRepository } from './users.repository.js';
import { UsersImportService } from './users.import.js';
import { UsersService } from './users.service.js';
import { SupabaseUsersRepository } from './users.supabase.repository.js';

export function createUsersRepository() {
  if (hasSupabaseAdminConfig()) {
    return new SupabaseUsersRepository();
  }

  return new InMemoryUsersRepository();
}

export function createUsersService() {
  return new UsersService(createUsersRepository());
}

export function createUsersImportService() {
  return new UsersImportService(createUsersRepository());
}
