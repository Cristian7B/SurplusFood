import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects routes with JWT Bearer token authentication. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
