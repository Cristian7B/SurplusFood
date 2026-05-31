import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { GeoModule } from '../geo/geo.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GeoModule, NotificationsModule],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
