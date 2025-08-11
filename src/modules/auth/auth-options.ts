import type { NextAuthOptions, DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { GoogleProfile } from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types/next-auth";

interface ExtendedUser extends DefaultUser {
  id: string;
  role?: UserRole;
  profileCompleted?: boolean;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ${name} não está definida`);
  return v;
}

const googleClientId = requireEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
const nextAuthSecret = requireEnv("NEXTAUTH_SECRET");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      profile(profile: GoogleProfile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture ?? null,
          role: "USER", // Valor padrão
          profileCompleted: false, // Valor inicial; será atualizado no jwt()
        };
      },
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        const profileCompleted =
          user.role === "ADMIN"
            ? true
            : Boolean(user.dniName && user.dni && user.phone && user.birthdate);

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          role: user.role as UserRole,
          profileCompleted,
          image:
            user.image ??
            "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png",
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as ExtendedUser).id;
        token.role = (user as ExtendedUser).role ?? "USER";
        token.profileCompleted = (user as ExtendedUser).profileCompleted ?? false;
        token.image = user.image ?? token.image;
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            role: true,
            image: true,
            dni: true,
            dniName: true,
            phone: true,
            birthdate: true,
          },
        });

        if (dbUser) {
          token.role = (dbUser.role as UserRole) || "USER";
          token.image =
            dbUser.image ||
            "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png";
          token.profileCompleted =
            dbUser.role === "ADMIN"
              ? true
              : Boolean(dbUser.dni && dbUser.dniName && dbUser.phone && dbUser.birthdate);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) || "USER";
        session.user.profileCompleted = Boolean(token.profileCompleted);
        session.user.image =
          (token.image as string) ||
          session.user.image ||
          "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png";
      }
      return session;
    },

    async redirect({ baseUrl, url }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: nextAuthSecret,
};
