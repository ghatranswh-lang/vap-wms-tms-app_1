import type { NextAuthConfig } from "next-auth";

// Cấu hình "Edge-safe" — dùng trong middleware.ts (chạy ở Edge runtime, KHÔNG
// được import bất cứ thứ gì đụng tới `pg`/`bcryptjs`/database). Không khai báo
// providers thật ở đây; providers (Credentials, cần truy vấn DB) chỉ khai báo
// trong src/auth.ts (chạy ở Node runtime, dùng cho API route + Server Components).
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname.startsWith("/login");
      const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");

      if (isApiAuth) return true;
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/", request.nextUrl.origin));
      }
      if (!isLoggedIn && !isLoginPage) return false; // -> redirects to pages.signIn
      return true;
    },
  },
} satisfies NextAuthConfig;
