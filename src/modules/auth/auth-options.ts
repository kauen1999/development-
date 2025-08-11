// src/modules/auth/auth-options.ts
import type { NextAuthOptions, User } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { User as PrismaUser } from "@prisma/client";

type Role = "ADMIN" | "USER";

/**
 * Calcula se o perfil está completo com base nos campos obrigatórios.
 */
function calculateProfileCompleted(userData: Pick<PrismaUser, "name" | "email" | "dni" | "phone" | "birthdate">): boolean {
  return Boolean(
    userData.name &&
      userData.email &&
      userData.dni &&
      userData.phone &&
      userData.birthdate
  );
}

async function verifyPasswordAndGetUser(
  email: string,
  password: string
): Promise<User | null> {
  console.info("[auth] verify:start", { email });

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      password: true,
      dniName: true,
      dni: true,
      phone: true,
      birthdate: true,
    },
  });

  if (!dbUser || !dbUser.password) {
    console.warn("[auth] verify:not_found_or_no_password");
    return null;
  }

  const ok = await bcrypt.compare(password, dbUser.password);
  if (!ok) {
    console.warn("[auth] verify:invalid_password");
    return null;
  }

  const user: User = {
    id: dbUser.id,
    name: dbUser.name ?? null,
    email: dbUser.email ?? null,
    image: dbUser.image ?? null,
    role: (dbUser.role as Role) ?? "USER",
    profileCompleted: calculateProfileCompleted(dbUser),
  };

  console.info("[auth] verify:success", { id: user.id, role: user.role });
  return user;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

function getProviders(): Provider[] {
  const list: Provider[] = [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(
        credentials?: Record<"email" | "password", string>
      ): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          console.warn("[auth] authorize:missing_fields");
          return null;
        }
        return verifyPasswordAndGetUser(credentials.email, credentials.password);
      },
    }),
  ];

  if (googleClientId && googleClientSecret) {
    list.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      })
    );
  }

  return list;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: getProviders(),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user.role as Role) ?? "USER";
        token.profileCompleted = (user as User & { profileCompleted?: boolean }).profileCompleted ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      const id = typeof token.id === "string" ? token.id : "";
      const role = (token.role as Role | undefined) ?? undefined;
      const profileCompleted = Boolean(token.profileCompleted);

      session.user = {
        ...session.user,
        id,
        role,
        profileCompleted,
      };
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  debug: process.env.NODE_ENV === "development",
};
