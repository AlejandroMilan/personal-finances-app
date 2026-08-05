import { JwtService } from '@nestjs/jwt';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const secret = 'test-secret';
  const service = new JwtTokenService(new JwtService(), secret, '1h');

  it('signs a payload into a verifiable JWT', () => {
    const token = service.sign({ sub: 'u1', email: 'ana@mail.com' });

    expect(token).toEqual(expect.any(String));
    const decoded = new JwtService().verify(token, { secret }) as {
      sub: string;
      email: string;
    };
    expect(decoded.sub).toBe('u1');
    expect(decoded.email).toBe('ana@mail.com');
  });

  it('verifies a signed token returning the payload', () => {
    const token = service.sign({ sub: 'u1', email: 'ana@mail.com' });

    const payload = service.verify(token);

    expect(payload).toMatchObject({ sub: 'u1', email: 'ana@mail.com' });
  });

  it('rejects a token signed with a different secret', () => {
    const token = new JwtService().sign({ sub: 'u1' }, { secret: 'other-secret' });

    expect(() => service.verify(token)).toThrow();
  });
});
