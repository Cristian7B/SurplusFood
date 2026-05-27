import { Module } from '@nestjs/common';
import { SurplusController } from './surplus.controller';
import { SurplusService } from './surplus.service';
import { GeoModule } from '../geo/geo.module';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [GeoModule, MatchingModule],
  controllers: [SurplusController],
  providers: [SurplusService],
  exports: [SurplusService],
})
export class SurplusModule {}
