import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [GeoModule],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
