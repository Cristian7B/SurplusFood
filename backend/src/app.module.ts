import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { SurplusModule } from './surplus/surplus.module';
import { GeoModule } from './geo/geo.module';
import { MatchingModule } from './matching/matching.module';

@Module({
  imports: [
    // Load .env variables globally
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GeoModule,
    MatchingModule,
    SurplusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
