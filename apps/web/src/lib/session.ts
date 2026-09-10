import { cookies } from "next/headers";
import type { Role } from "./api/auth";
import { ROLE_LABELS, type Session } from "./roles";

export const SESSION_COOKIE_NAME = "fixtrack_session";

/**
 * Marca de "este dispositivo ya conoce FixTrack Pro". Se escribe al
 * iniciar sesión con éxito y sobrevive de largo al vencimiento de la
 * sesión (8 h): cuando la cookie de sesión caduca, esta marca es lo que
 * hace que la raíz muestre /login en vez de la landing comercial a un
 * técnico cuya jornada expiró.
 *
 * NO contiene ningún dato de sesión ni nada aprovechable — es solo el
 * valor fijo "1", un indicador booleano de dispositivo. No se borra al
 * cerrar sesión: quien cerró sesión sigue siendo un usuario, no un
 * prospecto.
 */
export const DEVICE_KNOWN_COOKIE_NAME = "fixtrack_known";

/** Un año, en segundos. Se refresca en cada login (que ocurre al menos
 * cada 8 h en un dispositivo en uso), así que nunca se acerca a expirar. */
export const DEVICE_KNOWN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export { ROLE_LABELS, type Session };

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
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
    name: payload.name,
    role: payload.role,
    companyId: payload.companyId,
  };
}
