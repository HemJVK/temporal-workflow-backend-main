import { Module, Global } from '@nestjs/common';
import { Connection, Client } from '@temporalio/client';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'TEMPORAL_CLIENT',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        try {
          const address = configService.get<string>('temporal.address');
          const connection = await Connection.connect({ address });
          return new Client({ connection });
        } catch (e) {
          console.error('Could not connect to Temporal server', e);
          throw e;
        }
      },
    },
  ],
  exports: ['TEMPORAL_CLIENT'],
})
export class TemporalModule {}
