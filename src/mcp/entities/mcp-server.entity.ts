import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum McpTransportType {
  STDIO = 'stdio',
  SSE = 'sse',
}

@Entity('mcp_servers')
export class McpServer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: McpTransportType,
    default: McpTransportType.STDIO,
  })
  transportType: McpTransportType;

  // For stdio: JSON holding { command: string, args: string[], env?: Record<string, string> }
  // For sse: JSON holding { url: string }
  @Column('jsonb')
  config: any;

  @Column({ default: 'installed' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
