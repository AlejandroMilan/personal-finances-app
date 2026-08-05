export interface JwtPayload {
  sub: string;
  email: string;
}

export interface TokenService {
  sign(payload: JwtPayload): string;
  verify(token: string): JwtPayload;
}

export const TOKEN_SERVICE = 'TOKEN_SERVICE';
