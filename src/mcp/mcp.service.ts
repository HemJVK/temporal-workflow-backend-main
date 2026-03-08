import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpServer, McpTransportType } from './entities/mcp-server.entity';

@Injectable()
export class McpService implements OnModuleInit {
    private readonly logger = new Logger(McpService.name);

    constructor(
        @InjectRepository(McpServer)
        private readonly mcpServerRepository: Repository<McpServer>,
    ) { }

    async onModuleInit() {
        await this.seedDefaultServers();
    }

    private async seedDefaultServers() {
        this.logger.log('Checking and seeding default MCP servers...');
        const defaultServers = [
            {
                name: 'Filesystem',
                transportType: McpTransportType.STDIO,
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp', '/home/hem'],
                },
                status: 'installed'
            },
            {
                name: 'PostgreSQL',
                transportType: McpTransportType.STDIO,
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL || 'postgresql://localhost/mydb'],
                },
                status: 'installed'
            },
            {
                name: 'Brave Search',
                transportType: McpTransportType.STDIO,
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-brave-search'],
                    env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY || '' }
                },
                status: 'installed'
            },
            {
                name: 'GitHub',
                transportType: McpTransportType.STDIO,
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-github'],
                    env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '' }
                },
                status: 'installed'
            },
            {
                name: 'Memory',
                transportType: McpTransportType.STDIO,
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-memory'],
                },
                status: 'installed'
            },
            {
                name: 'Sequential Thinking',
                transportType: McpTransportType.STDIO,
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
                },
                status: 'installed'
            }
        ];

        for (const serverData of defaultServers) {
            try {
                const existing = await this.mcpServerRepository.findOne({ where: { name: serverData.name } });
                if (!existing) {
                    const server = this.mcpServerRepository.create(serverData);
                    await this.mcpServerRepository.save(server);
                    this.logger.log(`Seeded default MCP server: ${serverData.name}`);
                }
            } catch (error) {
                this.logger.error(`Failed to seed MCP server ${serverData.name}:`, error);
            }
        }
    }

    async create(data: Partial<McpServer>) {
        const existing = await this.mcpServerRepository.findOne({ where: { name: data.name } });
        if (existing) {
            Object.assign(existing, data);
            return this.mcpServerRepository.save(existing);
        }
        const server = this.mcpServerRepository.create(data);
        return this.mcpServerRepository.save(server);
    }

    async findAll() {
        return this.mcpServerRepository.find({ order: { createdAt: 'DESC' } });
    }

    async findOne(id: string) {
        const server = await this.mcpServerRepository.findOne({ where: { id } });
        if (!server) {
            throw new NotFoundException(`MCP Server ${id} not found`);
        }
        return server;
    }

    async remove(id: string) {
        const server = await this.findOne(id);
        return this.mcpServerRepository.remove(server);
    }
}
