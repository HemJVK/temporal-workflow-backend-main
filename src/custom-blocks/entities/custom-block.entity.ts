import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('custom_blocks')
export class CustomBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ length: 255 })
  name: string;

  @Column('text')
  description: string;

  // JSON schema for inputs (e.g. ["field1", "field2"])
  @Column('jsonb', { default: [] })
  inputs: string[];

  // The actual Javascript code to be executed
  @Column('text', { default: '' })
  customLogic: string;

  @Column({ default: false })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
