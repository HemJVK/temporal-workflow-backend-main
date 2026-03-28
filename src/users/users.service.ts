import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findBySsoId(sso_id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { sso_id } });
  }

  async findByPhone(phone_number: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone_number } });
  }

  async create(userParams: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userParams);
    return this.usersRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    return this.findById(id) as Promise<User>;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
