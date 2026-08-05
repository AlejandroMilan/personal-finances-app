import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, TokenService } from '../../application/ports/token-service';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.secret,
      expiresIn: this.expiresIn as unknown as number,
    });
  }

  verify(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, { secret: this.secret });
  }
}
