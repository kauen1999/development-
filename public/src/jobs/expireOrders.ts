import { expireOldOrdersJob } from "./expireOldOrders.job";
import { type NextApiRequest, type NextApiResponse } from "next";


// CRON endpoint for expiring old orders.
// Can be scheduled via Vercel Cron.
export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  await expireOldOrdersJob();
  res.status(200).json({ message: "✅ Expired old orders successfully" });
}
