import { NextResponse } from "next/server";
import {
  prisma,
  RoleCode,
  UserStatus,
} from "@ev-cpo/db";
import {
  attachSessionCookie,
  formatAuthUserResponse,
  hashPassword,
  jsonError,
  handleApiError,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const displayName = String(body.displayName || "").trim() || email.split("@")[0];
    const phone = body.phone ? String(body.phone).trim() : null;
    const locale = ["en", "ms", "zh"].includes(body.locale) ? body.locale : "en";

    if (!email || !email.includes("@")) {
      return jsonError(400, "INVALID_EMAIL", "Please provide a valid email address.");
    }

    if (!password || password.length < 6) {
      return jsonError(
        400,
        "WEAK_PASSWORD",
        "Password must be at least 6 characters."
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return jsonError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists."
      );
    }

    const isDemo = process.env.DEMO_MODE !== "false";
    const verificationCode = isDemo
      ? "888666"
      : String(Math.floor(100000 + Math.random() * 900000));
    const verificationExp = new Date(Date.now() + 30 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        displayName,
        locale,
        status: UserStatus.UNVERIFIED,
        credential: {
          create: {
            passwordHash: hashPassword(password),
            emailVerificationCode: verificationCode,
            emailVerificationExp: verificationExp,
          },
        },
        roles: {
          create: {
            roleCode: RoleCode.DRIVER,
          },
        },
      },
      include: {
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

    await prisma.emailDelivery.create({
      data: {
        toEmail: email,
        subject: "[Malaysia EV CPO] Verify your email address",
        templateCode: "EMAIL_VERIFY",
        bodyHtml: `<p>Welcome to Malaysia EV CPO (Phase 1A).</p><p>Your 6-digit email verification code is: <strong>${verificationCode}</strong></p>`,
        status: "SENT_DEMO",
        sentAt: new Date(),
      },
    });

    const formattedUser = formatAuthUserResponse(user);

    const response = NextResponse.json({
      ok: true,
      user: formattedUser,
      verificationCode: isDemo ? verificationCode : undefined,
      demoVerificationCode: isDemo ? verificationCode : undefined,
      message:
        "Account registered. Please verify your email before starting a charging session.",
    });

    attachSessionCookie(response, user);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
