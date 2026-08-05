import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../../application/ports/token-service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const tokenService: TokenService = { sign: jest.fn(), verify: jest.fn() };
  const guard = new JwtAuthGuard(tokenService);

  const context = (authorization?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization }, user: undefined }),
      }),
    }) as unknown as ExecutionContext;

  it('allows requests with a valid token and sets the user', () => {
    tokenService.verify = jest.fn().mockReturnValue({ sub: 'u1', email: 'ana@mail.com' });
    const request = { headers: { authorization: 'Bearer valid-token' }, user: undefined };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual({ id: 'u1', email: 'ana@mail.com' });
  });

  it('rejects requests without an authorization header', () => {
    expect(() => guard.canActivate(context())).toThrow(UnauthorizedException);
  });

  it('rejects requests with a non-bearer scheme', () => {
    expect(() => guard.canActivate(context('Basic abc'))).toThrow(UnauthorizedException);
  });

  it('rejects requests with an invalid token', () => {
    tokenService.verify = jest.fn().mockImplementation(() => {
      throw new Error('invalid');
    });
    expect(() => guard.canActivate(context('Bearer invalid-token'))).toThrow(
      UnauthorizedException,
    );
  });
});
