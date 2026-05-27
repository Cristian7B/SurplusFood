import { PartialType } from '@nestjs/swagger';
import { CreateSurplusDto } from './create-surplus.dto';

/**
 * All fields from CreateSurplusDto become optional for PATCH operations.
 * Status transitions are handled via dedicated action endpoints, not here.
 */
export class UpdateSurplusDto extends PartialType(CreateSurplusDto) {}
