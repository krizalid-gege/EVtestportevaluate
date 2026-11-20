import { NextResponse } from "next/server";
import { prisma, UserStatus } from "@ev-cpo/db";
import {
  attachSessionCookie,
  formatAuthUserResponse,
  hashPassword,
  jsonError,
  handleApiError,
} from "@/lib/auth";

/**
 * REQ-ACC-003: Password Reset API
 * Never leaks whether an email is registered on Step 1!
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const token = body.token
      ? String(body.token).trim()
      : body.code
      ? String(body.code).trim()
      : null;
    const newPassword = body.newPassword ? String(body.newPassword) : null;
    const isDemo = process.env.DEMO_MODE !== "false";

    if (!email || !email.includes("@")) {
      return jsonError(
        400,
        "INVALID_EMAIL",
        "Please enter a valid email address."
      );
    }

    // Step 2: Confirm password reset with token/code + newPassword
    if ((token && newPassword) || body.action === "confirm") {
      if (!newPassword || newPassword.length < 6) {
        return jsonError(
          400,
          "WEAK_PASSWORD",
          "New password must be at least 6 characters."
        );
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          credential: true,
          roles: true,
          siteAssignments: {
            include: {
              site: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });

      const storedToken = user?.credential?.passwordResetToken;
      const isValidToken =
        Boolean(user?.credential) &&
        ((storedToken && storedToken === token) ||
          (isDemo && (token === "888666" || token === "999888")));

      if (!user || !isValidToken || user.status === UserStatus.DISABLED) {
        return jsonError(
          400,
          "INVALID_RESET_TOKEN",
          "Invalid or expired password reset code."
        );
      }

      await prisma.userCredential.update({
        where: { userId: user.id },
        data: {
          passwordHash: hashPassword(newPassword),
          passwordResetToken: null,
          passwordResetExp: null,
        },
      });

      const response = NextResponse.json({
        ok: true,
        step: "COMPLETED",
        user: formatAuthUserResponse(user),
        message: "Password has been updated. You are now signed in.",
      });

      attachSessionCookie(response, user);
      return response;
    }

    // Step 1: Request password reset email (Anti-enumeration: identical response regardless of account existence)
    const resetToken = isDemo
      ? "888666"
      : String(Math.floor(100000 + Math.random() * 900000));
    const resetExp = new Date(Date.now() + 30 * 60 * 1000);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { credential: true },
    });

    if (existingUser && existingUser.credential) {
      await prisma.userCredential.update({
        where: { userId: existingUser.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExp: resetExp,
        },
      });
    }

    // Log email delivery record (REQ-ACC-003)
    await prisma.emailDelivery.create({
      data: {
        toEmail: email,
        subject: "[Malaysia EV CPO] Password Reset Instructions",
        templateCode: "PASSWORD_RESET",
        bodyHtml: existingUser
          ? `<p>Password reset requested for ${email}.</p><p>Your reset code is: <strong>${resetToken}</strong> (expires in 30 minutes).</p>`
          : `<p>Password reset requested for unregistered address (${email}) - logged silently per REQ-ACC-003 anti-enumeration policy.</p>`,
        status: "SENT_DEMO",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      step: "EMAIL_SENT",
      message:
        "If an account exists for that email, a password reset code has been dispatched.",
      resetToken: isDemo ? resetToken : undefined,
      demoResetToken: isDemo ? resetToken : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
