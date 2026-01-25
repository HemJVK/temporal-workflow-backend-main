import { Module, Global } from '@nestjs/common';
import { Connection, Client } from '@temporalio/client';

@Global()
@Module({
  providers: [
    {
      provide: 'TEMPORAL_CLIENT',
      useFactory: async () => {
        try {
          const connection = await Connection.connect();
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
