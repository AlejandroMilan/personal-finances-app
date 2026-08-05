export interface JwtPayload {
  sub: string;
  email: string;
}

export interface TokenService {
  sign(payload: JwtPayload): string;
}

export const TOKEN_SERVICE = 'TOKEN_SERVICE';
