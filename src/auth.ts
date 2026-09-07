import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";

// Cấu hình đầy đủ (Node runtime) — dùng cho API route /api/auth/* và Server
// Components/Actions. KHÔNG import file này từ middleware.ts (xem auth.config.ts).
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Tên đăng nhập", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        const rows = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        const user = rows[0];
        if (!user || !user.active) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user.id),
          name: user.fullName,
          username: user.username,
          role: user.role,
          xemCuoc: user.xemCuoc,
          carrierId: user.carrierId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.username = (user as { username?: string }).username;
        token.xemCuoc = (user as { xemCuoc?: boolean }).xemCuoc;
        token.carrierId = (user as { carrierId?: number | null }).carrierId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).role =
          token.role;
        (session.user as unknown as Record<string, unknown>).username =
          token.username;
        (session.user as unknown as Record<string, unknown>).xemCuoc =
          token.xemCuoc;
        (session.user as unknown as Record<string, unknown>).carrierId =
          token.carrierId;
      }
      return session;
    },
  },
});
