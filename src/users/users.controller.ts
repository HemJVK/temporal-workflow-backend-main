import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AdminGuard)
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    // Mask passwords and specific PII if needed, but for admin we might want basic visibility
    return users.map(u => ({
      id: u.id,
      email: u.email,
      phone_number: u.phone_number,
      credits: u.credits,
      is_admin: u.is_admin,
      is_email_verified: u.is_email_verified,
      is_phone_verified: u.is_phone_verified,
      has_seen_tutorial: u.has_seen_tutorial,
      created_at: u.created_at,
    }));
  }

  @UseGuards(AdminGuard)
  @Patch(':id/role')
  async updateRole(@Param('id') id: string, @Body('is_admin') is_admin: boolean) {
    return this.usersService.updateAdminStatus(id, is_admin);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
