import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/sign-in",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/projects/:path*",
    "/knowledge/:path*",
    "/artifacts/:path*",
    "/usage/:path*",
    "/routing/:path*",
    "/account/:path*",
    "/settings/:path*",
  ],
};
