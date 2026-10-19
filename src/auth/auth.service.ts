import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  private readonly DUMMY_HASH =
    '$2b$12$eDuMsEVNdXLAHobdIfqoRev5JFtl97qd3WMlf9vTFh8xdBBCUGARS';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(dto: LoginDto): Promise<User | null> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // Always run bcrypt.compare to prevent timing-based email enumeration
    const hashToCompare = user?.passwordHash ?? this.DUMMY_HASH;
    const isMatch = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !isMatch || !user.isActive) {
      return null;
    }

    return user;
  }

  async login(user: User): Promise<{
    accessToken: string;
    expiresIn: string;
    user: {
      id: string;
      email: string;
      role: string;
      firstName: string;
      lastName: string;
    };
  }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const expiresIn = this.configService.get<string>('jwt.expiresIn') ?? '1h';
    const accessToken = this.jwtService.sign(payload, { expiresIn: expiresIn as unknown as number });

    return {
      accessToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
