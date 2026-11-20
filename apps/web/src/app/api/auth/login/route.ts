import { NextResponse } from "next/server";
import { prisma, UserStatus } from "@ev-cpo/db";
import {
  attachSessionCookie,
  formatAuthUserResponse,
  verifyPassword,
  jsonError,
  handleApiError,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const demoQuickLogin = Boolean(body.demoQuickLogin || body.quickSwitch);
    const isDemo = process.env.DEMO_MODE !== "false";

    if (!email) {
      return jsonError(400, "INVALID_CREDENTIALS", "Email is required.");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        credential: true,
        roles: true,
        siteAssignments: {
          include: {
            site: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      return jsonError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    // REQ-ACC-005: Disabled accounts cannot log in or start charging
    if (user.status === UserStatus.DISABLED) {
      return jsonError(
        403,
        "ACCOUNT_DISABLED",
        "Your account has been disabled. Please contact customer support."
      );
    }

    if (!(demoQuickLogin && isDemo)) {
      const passwordHash = user.credential?.passwordHash || "";
      const valid = verifyPassword(password, passwordHash);
      if (!valid) {
        return jsonError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
      }
    }

    const formattedUser = formatAuthUserResponse(user);
    const verificationCode =
      isDemo && user.status === UserStatus.UNVERIFIED
        ? user.credential?.emailVerificationCode || "888666"
        : undefined;

    const response = NextResponse.json({
      ok: true,
      user: formattedUser,
      verificationCode,
      demoVerificationCode: verificationCode,
    });

    attachSessionCookie(response, user);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
