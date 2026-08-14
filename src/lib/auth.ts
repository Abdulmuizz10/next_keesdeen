import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { UserRole } from "./models/User";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * ACCOUNT LINKING DECISION (Phase 25):
 * We use auto-link by verified email (option a). Google emails are
 * pre-verified, so if a user already has a password-based account and
 * then signs in with Google using the same email, we find the existing
 * User, attach Google to it, and let them log in either way.
 * This is intentional — do not "fix" it without understanding why.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      image?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    image?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Google OAuth
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // Email/password credentials
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const dbConnect = (await import("./db")).default;
          const User = (await import("./models/User")).default;
          await dbConnect();

          const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
          if (!user) return null;
          if (!user.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth: auto-link by verified email or create new user
      if (account?.provider === "google" && user.email) {
        try {
          const dbConnect = (await import("./db")).default;
          const User = (await import("./models/User")).default;
          await dbConnect();

          let dbUser = await User.findOne({ email: user.email.toLowerCase() });

          if (dbUser) {
            // Existing user — link Google ID if not already set
            if (!dbUser.googleId && account.providerAccountId) {
              dbUser.googleId = account.providerAccountId;
              if (user.image && !dbUser.image) dbUser.image = user.image;
              await dbUser.save();
            }
          } else {
            // New user — create with customer role
            dbUser = await User.create({
              email: user.email.toLowerCase(),
              name: user.name || "Google User",
              role: "customer",
              googleId: account.providerAccountId,
              image: user.image,
              emailVerified: new Date(),
            });
          }

          // Attach DB fields to the user object for the JWT callback
          user.id = dbUser._id.toString();
          user.role = dbUser.role;
          user.name = dbUser.name;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },

    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const publicPaths = [
        "/", "/category", "/product", "/cart", "/collections",
        "/shop", "/search", "/search-results",
        "/about", "/contact", "/privacy", "/terms",
        "/shipping-returns", "/api/health",
      ];

      if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
      if (pathname.startsWith("/api/auth") || pathname.startsWith("/auth")) return true;
      if (pathname.startsWith("/admin") || pathname.startsWith("/checkout") || pathname.startsWith("/account")) return !!auth;

      return true;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  trustHost: true,
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
