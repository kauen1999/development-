import type { NextAuthOptions, User } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/server/db/client";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import type { JWT } from "next-auth/jwt";

// Perfil completo?
function isProfileComplete(user: {
  name?: string | null;
  email?: string | null;
  dniName?: string | null;
  dni?: string | null;
  phone?: string | null;
  birthdate?: Date | string | null;
}): boolean {
  return Boolean(
    user?.name &&
      user?.email &&
      user?.dniName &&
      user?.dni &&
      user?.phone &&
      user?.birthdate
  );
}

// Carrega dados mínimos para preencher JWT/Session
async function getUserData(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      dniName: true,
      dni: true,
      phone: true,
      birthdate: true,
      image: true,
      emailVerified: true,
    },
  });
}

function getProviders(): Provider[] {
  const list: Provider[] = [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // 🚨 Bloqueia login se o e-mail não estiver verificado (mensagem em ES)
        if (!user.emailVerified) {
          throw new Error(
            "Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada o haz clic en «Reenviar verificación» para continuar."
          );
        }

        const result: User = {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role as Role,
            profileCompleted: isProfileComplete(user),
            emailVerified: !!user.emailVerified,
        };
        return result;
      },
    }),
  ];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  return list;
}

export const authOptions: NextAuthOptions = {
  providers: getProviders(),
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      // Google: considerar e-mail verificado
      if (account?.provider === "google" && user?.email) {
        let dbUser = await prisma.user.findUnique({ where: { email: user.email } });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "",
              image: user.image ?? null,
              provider: "google",
              role: "USER",
              emailVerified: new Date(),
            },
          });
        } else {
          const needsUpdate =
            (user.name && user.name !== dbUser.name) ||
            (user.image && user.image !== dbUser.image) ||
            dbUser.provider !== "google" ||
            !dbUser.emailVerified;

          if (needsUpdate) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                name: user.name ?? dbUser.name,
                image: user.image ?? dbUser.image,
                provider: "google",
                emailVerified: dbUser.emailVerified ?? new Date(),
              },
            });
          }
        }
      }
      return true;
    },

    async jwt({ token, user }): Promise<JWT> {
      const email = user?.email ?? token.email ?? null;
      if (!email) return token;

      const dbUser = await getUserData(email);
      if (dbUser) {
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.email = dbUser.email;
        token.name = dbUser.name;
        token.profileCompleted = isProfileComplete(dbUser);
        token.emailVerified = !!dbUser.emailVerified;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id,
        role: token.role,
        profileCompleted: token.profileCompleted,
        emailVerified: token.emailVerified,
      };
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
