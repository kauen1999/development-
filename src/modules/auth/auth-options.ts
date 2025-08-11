// src/modules/auth/auth-options.ts
import type { NextAuthOptions, DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
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

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          role: user.role as UserRole,
          profileCompleted: Boolean(
            user.dniName && user.dni && user.phone && user.birthdate
          ),
          image:
            user.image ??
            "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png",
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = (profile as { email?: string })?.email;
        const emailVerified =
          (profile as { email_verified?: boolean })?.email_verified ?? false;

        if (!email || !emailVerified) return false;

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email,
              name: (profile as { name?: string })?.name ?? "",
              image:
                (profile as { picture?: string })?.picture ??
                "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png",
              role: "USER",
              provider: "GOOGLE",
            },
          });
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      const userId = (user as ExtendedUser)?.id || (token.id as string);

      if (!userId) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
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
        token.id = dbUser.id;
        token.role = (dbUser.role as UserRole) || "USER";
        token.image =
          dbUser.image ??
          "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png";
        token.profileCompleted = Boolean(
          dbUser.dni && dbUser.dniName && dbUser.phone && dbUser.birthdate
        );
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) || "USER";
        session.user.profileCompleted = Boolean(token.profileCompleted);
        session.user.image =
          (token.image as string) ??
          "https://definicion.de/wp-content/uploads/2019/07/perfil-de-usuario.png";
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: nextAuthSecret,
};
