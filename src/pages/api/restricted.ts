// src/pages/api/restricted.ts
import { type NextApiRequest, type NextApiResponse } from "next";
import { getServerAuthSessionApi } from "@/server/auth"; // <- CORRETO

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await getServerAuthSessionApi(req, res);

  if (!session) {
    return res.status(401).json({
      error: "Você precisa estar autenticado para acessar este conteúdo.",
    });
  }

  return res.status(200).json({
    content: "Este é um conteúdo protegido. Acesso concedido.",
    user: {
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
  });
};

export default handler;
