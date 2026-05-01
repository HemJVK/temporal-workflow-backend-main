import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomBlock } from './entities/custom-block.entity';
import {
  CreateCustomBlockDto,
  UpdateCustomBlockDto,
} from './dto/create-custom-block.dto';

@Injectable()
export class CustomBlocksService {
  constructor(
    @InjectRepository(CustomBlock)
    private readonly blockRepo: Repository<CustomBlock>,
  ) {}

  async create(
    dto: CreateCustomBlockDto,
    userId: string,
  ): Promise<CustomBlock> {
    const block = this.blockRepo.create({
      ...dto,
      userId,
      inputs: dto.inputs ?? [],
      customLogic: dto.customLogic ?? '',
    });
    return this.blockRepo.save(block);
  }

  findAll(userId: string): Promise<CustomBlock[]> {
    // Return user's blocks OR public blocks
    return this.blockRepo
      .createQueryBuilder('block')
      .where('block.userId = :userId', { userId })
      .orWhere('block.isPublic = :isPublic', { isPublic: true })
      .orderBy('block.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, userId: string): Promise<CustomBlock> {
    const block = await this.blockRepo.findOne({
      where: [
        { id, userId },
        { id, isPublic: true },
      ],
    });
    if (!block) throw new NotFoundException(`CustomBlock ${id} not found`);
    return block;
  }

  async update(
    id: string,
    dto: UpdateCustomBlockDto,
    userId: string,
  ): Promise<CustomBlock> {
    // Only owner can update
    const block = await this.blockRepo.findOne({ where: { id, userId } });
    if (!block)
      throw new NotFoundException(
        `CustomBlock ${id} not found or you don't have permission`,
      );

    await this.blockRepo.update(id, dto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    // Only owner can delete
    const block = await this.blockRepo.findOne({ where: { id, userId } });
    if (!block)
      throw new NotFoundException(
        `CustomBlock ${id} not found or you don't have permission`,
      );

    await this.blockRepo.delete(id);
    return { success: true };
  }
}
