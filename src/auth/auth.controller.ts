import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { CurrentUser } from '../security/decorators/current-user.decorator';
import { Public } from '../security/decorators/public.decorator';
import { RefreshJwtAuthGuard } from '../security/guards/refresh-jwt-auth.guard';
import { AuthenticatedUser } from '../security/interfaces/authenticated-user.interface';
import { REFRESH_TOKEN_COOKIE } from '../security/constants';

import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, req.ip, this.userAgent(req));
    this.setRefreshCookie(res, result.refreshToken);
    return this.publicResult(result);
  }

  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.getRefreshToken(req, dto);

    const result = await this.auth.refresh(
      user.id,
      user.sessionId,
      user.jti,
      token,
      req.ip,
      this.userAgent(req),
    );

    this.setRefreshCookie(res, result.refreshToken);
    return this.publicResult(result);
  }

  @UseGuards(RefreshJwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.auth.logout(user.sessionId, req.ip, this.userAgent(req));
    this.clearRefreshCookie(res);
    return { success: true };
  }

  private getRefreshToken(req: Request, dto: RefreshDto): string {
    const cookieToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      return cookieToken;
    }

    if (typeof dto.refreshToken === 'string' && dto.refreshToken.length > 0) {
      return dto.refreshToken;
    }

    throw new UnauthorizedException('Refresh token not found');
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: this.getRefreshCookieMaxAge(),
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    });
  }

  private getRefreshCookieMaxAge(): number {
    const raw = process.env.JWT_REFRESH_TTL_SECONDS;
    const seconds = raw === undefined ? 2_592_000 : Number(raw);

    if (!Number.isSafeInteger(seconds) || seconds <= 0) {
      throw new Error('JWT_REFRESH_TTL_SECONDS must be a positive integer');
    }

    return seconds * 1000;
  }

  private publicResult<T extends { refreshToken: string }>(result: T): Omit<T, 'refreshToken'> {
    const { refreshToken: _refreshToken, ...safeResult } = result;
    return safeResult;
  }

  private userAgent(req: Request): string | undefined {
    const value = req.headers['user-agent'];
    return Array.isArray(value) ? value[0] : value;
  }
}
