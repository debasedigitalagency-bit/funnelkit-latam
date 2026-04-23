import Whop from "@whop/sdk";

// Singleton del cliente Whop — importar desde aquí en toda la app
export const whopsdk = new Whop({
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
  // webhookKey se pasa como base64 del secreto del webhook
  webhookKey: process.env.WHOP_WEBHOOK_SECRET
    ? btoa(process.env.WHOP_WEBHOOK_SECRET)
    : undefined,
});

export const WHOP_COMPANY_ID = process.env.WHOP_COMPANY_ID!;
