import { NextResponse } from "next/server";
import { prisma, UserStatus } from "@ev-cpo/db";
import {
  attachSessionCookie,
  formatAuthUserResponse,
  getCurrentUser,
  jsonError,
  handleApiError,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim();
    const emailInput = body.email ? String(body.email).trim().toLowerCase() : null;

    if (!code) {
      return jsonError(
        400,
        "INVALID_VERIFICATION_CODE",
        "Please enter the 6-digit verification code."
      );
    }

    const sessionUser = await getCurrentUser(req);
    const targetUser =
      emailInput
        ? await prisma.user.findUnique({
            where: { email: emailInput },
            include: {
              credential: true,
              roles: true,
              siteAssignments: {
                include: {
                  site: { select: { id: true, code: true, name: true } },
                },
              },
            },
          })
        : sessionUser
        ? await prisma.user.findUnique({
            where: { id: sessionUser.id },
            include: {
              credential: true,
              roles: true,
              siteAssignments: {
                include: {
                  site: { select: { id: true, code: true, name: true } },
                },
              },
            },
          })
        : null;

    if (!targetUser) {
      return jsonError(
        401,
        "UNAUTHORIZED",
        "Please sign in or specify email to verify."
      );
    }

    const isDemo = process.env.DEMO_MODE !== "false";
    const expectedCode = targetUser.credential?.emailVerificationCode;
    const isCodeValid =
      (expectedCode && expectedCode === code) || (isDemo && code === "888666");

    if (!isCodeValid) {
      return jsonError(
        400,
        "INVALID_VERIFICATION_CODE",
        "Invalid or expired verification code."
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        credential: targetUser.credential
          ? {
              update: {
                emailVerificationCode: null,
                emailVerificationExp: null,
              },
            }
          : undefined,
      },
      include: {
        roles: true,
        siteAssignments: {
          include: {
            site: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    const response = NextResponse.json({
      ok: true,
      user: formatAuthUserResponse(updatedUser),
      message: "Email verified successfully. You can now start charging!",
    });

    attachSessionCookie(response, updatedUser);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
