import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/phone";
import { APP_NAME } from "@/lib/brand";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Phone or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const loginId = String(credentials.email).trim();
        const password = String(credentials.password);
        const normalizedPhone = normalizePhone(loginId);

        const [user] = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.email, loginId),
              eq(users.phone, loginId),
              eq(users.phone, normalizedPhone)
            )
          )
          .limit(1);

        if (!user || user.status !== "active") return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, user.organizationId))
          .limit(1);

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: org?.name ?? APP_NAME,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.phone = token.phone;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
