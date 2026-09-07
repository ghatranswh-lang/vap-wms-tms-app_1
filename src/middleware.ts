import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Chỉ dùng authConfig (Edge-safe, không đụng DB) ở đây — KHÔNG import từ "@/auth".
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
