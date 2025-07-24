// src/modules/auth/nextauth.session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/nextauth.session-helper";
import type { NextApiRequest, NextApiResponse } from "next";

export const getServerAuthSession = (opts: {
  req: NextApiRequest;
  res: NextApiResponse;
}) => {
  return getServerSession(opts.req, opts.res, authOptions);
};
