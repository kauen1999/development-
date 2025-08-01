import handlePagoTICWebhook from "@/modules/pagotic/pagotic.webhook";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default handlePagoTICWebhook;
