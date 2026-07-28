import { cookies } from "next/headers";
import type { Role } from "./api/auth";
import { ROLE_LABELS, type Session } from "./roles";

export const SESSION_COOKIE_NAME = "fixtrack_session";

export { ROLE_LABELS, type Session };

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  companyId: string;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  try {
    const json = Buffer.from(segments[1], "base64url").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Server-only. Lee la cookie httpOnly y decodifica el payload del JWT
 * SIN verificar la firma — la verificación real ocurre en NestJS (JwtStrategy)
 * en cada request al backend. Aquí solo se usa para render condicional en el server.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    companyId: payload.companyId,
  };
}
