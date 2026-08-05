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
});
