import { IsOptional, IsString } from 'class-validator';

/**
 * The preferred refresh-token transport is an HttpOnly cookie.
 * The optional field exists for non-browser clients.
 */
export class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
