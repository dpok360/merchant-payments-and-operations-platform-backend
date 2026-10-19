import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { Role } from './enums/role.enum.js';

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  role: Role;
  firstName: string;
  lastName: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      ...dto,
      email: dto.email.toLowerCase(),
    });
    return this.usersRepository.save(user);
  }

  async findAllByRole(role: Role): Promise<User[]> {
    return this.usersRepository.find({ where: { role } });
  }
}
