import type { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../src/users/entities/user.entity.js';
import { Role } from '../../src/users/enums/role.enum.js';

export const TEST_USERS = {
  admin:     { email: 'admin@test.com',     password: 'AdminPass123!',    role: Role.ADMIN,    firstName: 'Admin',    lastName: 'User' },
  reviewer1: { email: 'reviewer1@test.com', password: 'Reviewer1Pass!',   role: Role.REVIEWER, firstName: 'Reviewer', lastName: 'One' },
  reviewer2: { email: 'reviewer2@test.com', password: 'Reviewer2Pass!',   role: Role.REVIEWER, firstName: 'Reviewer', lastName: 'Two' },
  sales1:    { email: 'sales1@test.com',    password: 'Sales1Pass123!',    role: Role.SALES,    firstName: 'Sales',    lastName: 'One' },
  sales2:    { email: 'sales2@test.com',    password: 'Sales2Pass123!',    role: Role.SALES,    firstName: 'Sales',    lastName: 'Two' },
};

export async function seedTestUsers(dataSource: DataSource): Promise<Record<string, User>> {
  const repo = dataSource.getRepository(User);
  const created: Record<string, User> = {};

  for (const [key, data] of Object.entries(TEST_USERS)) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = repo.create({
      email: data.email,
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    created[key] = await repo.save(user);
  }

  return created;
}
