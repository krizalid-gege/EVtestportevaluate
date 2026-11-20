import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  prisma,
  RoleCode,
  UserStatus,
  signSessionToken,
  verifySessionToken,
  hashPassword,
  verifyPassword,
} from "@ev-cpo/db";

export {
  RoleCode,
  UserStatus,
  signSessionToken,
  verifySessionToken,
  hashPassword,
  verifyPassword,
};

export const SESSION_COOKIE_NAME = "ev_cpo_session";

export class ApiHttpError extends Error {
  status: number;
  errorCode: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    errorCode: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string | null;
  displayName: string | null;
  locale: string;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  paymentRestricted: boolean;
  paymentRestrictNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  roles: RoleCode[];
  roleCodes: RoleCode[];
  roleObjects: Array<{ id: string; roleCode: RoleCode }>;
  siteAssignments: Array<{
    id: string;
    siteId: string;
    site: {
      id: string;
      code: string;
      name: string;
    };
  }>;
  assignedSiteIds: string[];
  siteCodes: string[];
}

function parseCookieHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...vParts] = part.trim().split("=");
    if (k === name) {
      return decodeURIComponent(vParts.join("="));
    }
  }
  return null;
}

export async function extractSessionToken(req?: Request): Promise<string | null> {
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }
    const fromHeaderCookie = parseCookieHeader(
      req.headers.get("cookie"),
      SESSION_COOKIE_NAME
    );
    if (fromHeaderCookie) return fromHeaderCookie;
  }

  try {
    const cookieStore = await cookies();
    const cookieObj = cookieStore.get(SESSION_COOKIE_NAME);
    if (cookieObj?.value) {
      return cookieObj.value;
    }
  } catch {
    // Fallback if called outside Next.js request context
  }

  return null;
}

/**
 * Fetches current user from `ev_cpo_session` cookie or Bearer token.
 * Enforces REQ-ACC-005: DISABLED accounts cannot authenticate.
 */
export async function getCurrentUser(req?: Request): Promise<AuthenticatedUser | null> {
  const token = await extractSessionToken(req);
  if (!token) return null;

  const decoded = verifySessionToken(token);
  if (!decoded?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      roles: true,
      siteAssignments: {
        include: {
          site: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;
  if (user.status === UserStatus.DISABLED) {
    return null;
  }

  const roleCodes = user.roles.map((r) => r.roleCode);
  const assignedSiteIds = user.siteAssignments.map((s) => s.siteId);
  const siteCodes = user.siteAssignments.map((s) => s.site.code);

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    locale: user.locale,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    paymentRestricted: user.paymentRestricted,
    paymentRestrictNote: user.paymentRestrictNote,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: roleCodes,
    roleCodes,
    roleObjects: user.roles.map((r) => ({ id: r.id, roleCode: r.roleCode })),
    siteAssignments: user.siteAssignments.map((s) => ({
      id: s.id,
      siteId: s.siteId,
      site: s.site,
    })),
    assignedSiteIds,
    siteCodes,
  };
}

/**
 * Requires an authenticated, non-disabled user.
 */
export async function requireAuth(req?: Request): Promise<AuthenticatedUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new ApiHttpError(
      401,
      "UNAUTHORIZED",
      "Authentication required. Please sign in."
    );
  }
  return user;
}

/**
 * RBAC Guard (Section 5, REQ-ADM-001, REQ-ADM-002):
 * If the user does not hold at least one of `allowedRoles`, writes an AuditLog
 * with `isSecurity: true` and `action: "UNAUTHORIZED_ATTEMPT"` and throws a 403 ApiHttpError.
 */
export async function requireRole(
  user: AuthenticatedUser,
  allowedRoles: RoleCode[],
  actionName: string,
  targetType: string,
  targetId: string,
  ipAddress?: string | null
): Promise<void> {
  const hasPermission = user.roleCodes.some((role) => allowedRoles.includes(role));
  if (!hasPermission) {
    const actorRolesStr = user.roleCodes.join(",") || "NONE";
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: actorRolesStr,
        action: "UNAUTHORIZED_ATTEMPT",
        targetType,
        targetId,
        reason: `Unauthorized attempt to execute ${actionName} (required: ${allowedRoles.join("|")}, actual: ${actorRolesStr})`,
        beforeState: {
          attemptedAction: actionName,
          requiredRoles: allowedRoles,
          actorRoles: user.roleCodes,
        },
        ipAddress: ipAddress || "127.0.0.1",
        isSecurity: true,
      },
    });

    throw new ApiHttpError(
      403,
      "FORBIDDEN",
      `Role [${actorRolesStr}] is not permitted to perform [${actionName}]. Security audit log recorded.`
    );
  }
}

/**
 * Site-level RBAC filter (REQ-ADM-001):
 * - ADMIN or CUSTOMER_SERVICE -> `{}` (all sites)
 * - SITE_STAFF -> `{ siteId: { in: assignedSiteIds } }`
 */
export function getSiteFilter(
  user: Pick<AuthenticatedUser, "roleCodes" | "siteAssignments">
): { siteId?: { in: string[] } } {
  if (
    user.roleCodes.includes(RoleCode.ADMIN) ||
    user.roleCodes.includes(RoleCode.CUSTOMER_SERVICE)
  ) {
    return {};
  }
  if (user.roleCodes.includes(RoleCode.SITE_STAFF)) {
    return {
      siteId: {
        in: user.siteAssignments.map((s) => s.siteId),
      },
    };
  }
  return {
    siteId: {
      in: [],
    },
  };
}

/**
 * Checks whether a staff member has object-level access to a specific siteId.
 */
export function hasSiteAccess(
  user: Pick<AuthenticatedUser, "roleCodes" | "siteAssignments">,
  siteId: string
): boolean {
  if (
    user.roleCodes.includes(RoleCode.ADMIN) ||
    user.roleCodes.includes(RoleCode.CUSTOMER_SERVICE)
  ) {
    return true;
  }
  if (user.roleCodes.includes(RoleCode.SITE_STAFF)) {
    return user.siteAssignments.some((s) => s.siteId === siteId);
  }
  return false;
}

/**
 * Masks email for CUSTOMER_SERVICE (and SITE_STAFF) when user is not ADMIN (Section 5 & Section 13.1).
 * Example: "driver@evcpo.my" -> "d***r@evcpo.my"
 */
export function maskEmailForCs(
  email: string | null | undefined,
  userRoles: RoleCode[]
): string {
  if (!email) return "-";
  if (userRoles.includes(RoleCode.ADMIN)) {
    return email;
  }
  if (
    userRoles.includes(RoleCode.CUSTOMER_SERVICE) ||
    userRoles.includes(RoleCode.SITE_STAFF)
  ) {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    if (local.length <= 2) {
      return `${local[0] || "*"}***@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }
  return email;
}

/**
 * Masks phone number for CUSTOMER_SERVICE / SITE_STAFF when user is not ADMIN.
 * Example: "+60123456789" -> "+6012****789"
 */
export function maskPhoneForCs(
  phone: string | null | undefined,
  userRoles: RoleCode[]
): string | null {
  if (!phone) return null;
  if (userRoles.includes(RoleCode.ADMIN)) {
    return phone;
  }
  if (
    userRoles.includes(RoleCode.CUSTOMER_SERVICE) ||
    userRoles.includes(RoleCode.SITE_STAFF)
  ) {
    const trimmed = phone.trim();
    if (trimmed.length <= 6) return "****";
    return `${trimmed.slice(0, 5)}****${trimmed.slice(-3)}`;
  }
  return phone;
}

/**
 * Formats a Prisma User with roles and siteAssignments into a consistent client-safe payload.
 */
export function formatAuthUserResponse(user: {
  id: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
  locale?: string;
  status: UserStatus;
  emailVerifiedAt?: Date | null;
  roles: Array<{ id?: string; roleCode: RoleCode } | RoleCode>;
  siteAssignments?: Array<{
    id?: string;
    siteId: string;
    site?: { id: string; code: string; name: string };
  }>;
}) {
  const roleCodes: RoleCode[] = user.roles.map((r) =>
    typeof r === "string" ? r : r.roleCode
  );
  const siteAssignments = user.siteAssignments || [];
  const assignedSiteIds = siteAssignments.map((s) => s.siteId);
  const siteCodes = siteAssignments
    .map((s) => s.site?.code)
    .filter((c): c is string => Boolean(c));

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    phone: user.phone ?? null,
    locale: user.locale ?? "en",
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    roles: roleCodes,
    roleCodes,
    siteAssignments,
    assignedSiteIds,
    siteCodes,
  };
}

/**
 * Creates a signed JWT token and attaches the `ev_cpo_session` cookie to a NextResponse.
 */
export function attachSessionCookie(
  response: NextResponse,
  user: {
    id: string;
    email: string;
    status: string;
    roles: Array<{ roleCode: string } | string>;
    siteAssignments?: Array<{ siteId: string }>;
  }
): string {
  const roles = user.roles.map((r) => (typeof r === "string" ? r : r.roleCode));
  const token = signSessionToken({
    userId: user.id,
    email: user.email,
    roles,
    status: user.status,
    siteIds: (user.siteAssignments || []).map((s) => s.siteId),
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function jsonError(
  status: number,
  errorCode: string,
  message: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      errorCode,
      message,
      ...(extra || {}),
    },
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiHttpError) {
    return jsonError(error.status, error.errorCode, error.message, error.details);
  }
  const message =
    error instanceof Error ? error.message : "Unexpected internal server error";
  return jsonError(500, "INTERNAL_ERROR", message);
}
