import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
    constructor(private readonly mcpService: McpService) { }

    // Local Installed Servers
    @Get('servers')
    async getInstalledServers() {
        return this.mcpService.findAll();
    }

    @Post('servers')
    async installServer(@Body() body: any) {
        return this.mcpService.create(body);
    }

    @Delete('servers/:id')
    async uninstallServer(@Param('id') id: string) {
        return this.mcpService.remove(id);
    }

    // Proxied Marketplace APIs
    @Get('marketplace/smithery')
    async getSmitheryPlugins(@Query('q') query?: string) {
        try {
            let url = 'https://api.smithery.ai/servers';
            if (query) {
                url += `?q=${encodeURIComponent(query)}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            let servers = data.servers || [];

            if (query) {
                const q = query.toLowerCase();
                servers = servers.filter((s: any) =>
                    s.displayName?.toLowerCase().includes(q) ||
                    s.qualifiedName?.toLowerCase().includes(q) ||
                    s.description?.toLowerCase().includes(q)
                );
            }

            return {
                data: servers.map((s: any) => ({
                    id: s.id || s.qualifiedName,
                    name: s.displayName || s.qualifiedName,
                    package: s.qualifiedName,
                    description: s.description,
                    config: {
                        command: 'npx',
                        args: ['-y', '@smithery/cli@latest', 'run', s.qualifiedName]
                    }
                }))
            };
        } catch (e) {
            return { data: [] };
        }
    }

    @Get('marketplace/glama')
    async getGlamaMcpServers(@Query('q') query?: string) {
        try {
            const response = await fetch('https://api.glama.ai/api/v1/mcp/servers');
            const data = await response.json();
            let servers = Array.isArray(data) ? data : (data.data || data.servers || []);

            if (query) {
                const q = query.toLowerCase();
                servers = servers.filter((s: any) =>
                    s.name?.toLowerCase().includes(q) ||
                    s.description?.toLowerCase().includes(q)
                );
            }
            return {
                data: servers.map((s: any) => ({
                    id: s.id || s.name,
                    name: s.name,
                    package: s.npmPackage || s.name,
                    description: s.description
                }))
            };
        } catch (e) {
            return { data: [] };
        }
    }
}
