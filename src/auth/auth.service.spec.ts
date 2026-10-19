import { jest } from '@jest/globals';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '../users/enums/role.enum.js';
import { User } from '../users/entities/user.entity.js';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;

  const mockUser: User = {
    id: 'user-uuid',
    email: 'sales1@example.com',
    passwordHash: '',
    role: Role.SALES,
    firstName: 'Sales',
    lastName: 'One',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    mockUser.passwordHash = hash;

    usersService = {
      findByEmailWithPassword: jest.fn() as UsersService['findByEmailWithPassword'],
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.token') as JwtService['sign'],
    };
    configService = {
      get: jest.fn().mockReturnValue('1h') as ConfigService['get'],
    };

    authService = new AuthService(
      usersService as UsersService,
      jwtService as JwtService,
      configService as ConfigService,
    );
  });

  describe('validateUser', () => {
    it('returns null for unknown email', async () => {
      (usersService.findByEmailWithPassword as ReturnType<typeof jest.fn>).mockResolvedValue(null);
      const result = await authService.validateUser({ email: 'unknown@test.com', password: 'x' });
      expect(result).toBeNull();
    });

    it('returns null for wrong password', async () => {
      (usersService.findByEmailWithPassword as ReturnType<typeof jest.fn>).mockResolvedValue(mockUser);
      const result = await authService.validateUser({ email: mockUser.email, password: 'wrong' });
      expect(result).toBeNull();
    });

    it('returns null for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      (usersService.findByEmailWithPassword as ReturnType<typeof jest.fn>).mockResolvedValue(inactiveUser);
      const result = await authService.validateUser({ email: mockUser.email, password: 'correct-password' });
      expect(result).toBeNull();
    });

    it('returns user for valid credentials', async () => {
      (usersService.findByEmailWithPassword as ReturnType<typeof jest.fn>).mockResolvedValue(mockUser);
      const result = await authService.validateUser({ email: mockUser.email, password: 'correct-password' });
      expect(result).toBeTruthy();
      expect(result?.id).toBe(mockUser.id);
    });
  });

  describe('login', () => {
    it('returns accessToken with correct payload', async () => {
      const result = await authService.login(mockUser);
      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.role).toBe(mockUser.role);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id, email: mockUser.email, role: mockUser.role }),
        expect.any(Object),
      );
    });

    it('does not expose passwordHash', async () => {
      const result = await authService.login(mockUser);
      expect(JSON.stringify(result)).not.toContain('passwordHash');
    });
  });
});
