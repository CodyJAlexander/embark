export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export interface AppEnv {
  Variables: {
    userId: string;
    userEmail: string;
    userRole: string;
  };
}
