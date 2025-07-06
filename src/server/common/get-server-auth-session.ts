// src/server/common/get-server-auth-session.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import type { NextApiRequest, NextApiResponse } from "next";

export const getServerAuthSession = (opts: {
  req: NextApiRequest;
  res: NextApiResponse;
}) => {
  return getServerSession(opts.req, opts.res, authOptions);
};
