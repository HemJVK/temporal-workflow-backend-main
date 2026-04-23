import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
    constructor(
        private readonly mcpService: McpService,
        private readonly configService: ConfigService,
    ) { }

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
            const glamaKey = this.configService.get<string>('GLAMA_API_KEY');
            const glamaUrl = query
                ? `https://glama.ai/api/mcp/v1/servers?q=${encodeURIComponent(query)}`
                : 'https://glama.ai/api/mcp/v1/servers';

            const response = await fetch(glamaUrl, {
                headers: glamaKey ? { Authorization: `Bearer ${glamaKey}` } : {},
            });

            if (!response.ok) {
                return { data: [] };
            }

            const data = await response.json() as any;
            const servers: any[] = Array.isArray(data)
                ? data
                : (data.servers || data.data || []);

            return {
                data: servers.map((s: any) => ({
                    id: s.id || s.slug || s.name,
                    name: s.name || s.id,
                    package: s.npmPackage || s.package || s.name,
                    description: s.description || '',
                    config: {
                        command: 'npx',
                        args: ['-y', s.npmPackage || s.package || s.name],
                    },
                }))
            };
        } catch (e) {
            return { data: [] };
        }
    }
}
