// src/server/nextauth.session-helper.ts
import { getServerSession } from "next-auth/next";
import type { GetServerSidePropsContext } from "next";
import type { NextApiRequest, NextApiResponse } from "next";
import { authOptions } from "../modules/auth/next-auth/nextauth.options";

// Para SSR (getServerSideProps)
export async function getServerAuthSession(ctx: GetServerSidePropsContext) {
  return await getServerSession(ctx.req, ctx.res, authOptions);
}

// Para rotas API (NextApiRequest/Response)
export async function getServerAuthSessionApi(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return await getServerSession(req, res, authOptions);
}

export { authOptions };
