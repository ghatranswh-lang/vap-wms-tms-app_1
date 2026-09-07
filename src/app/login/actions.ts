"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const callbackUrl = String(formData.get("callbackUrl") || "/");

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: callbackUrl,
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Sai tên đăng nhập hoặc mật khẩu." };
    }
    // NextAuth throws a redirect "error" on success — rethrow it so Next.js can navigate.
    throw err;
  }
}
