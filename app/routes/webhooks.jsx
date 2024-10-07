import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);

  const requestBody = await request.text();
  console.log(`Incoming webhook request: ${requestBody}`);

  // Handle different webhook topics
  switch (topic) {
    case "APP_UNINSTALLED":
      console.log(`App uninstalled by shop: ${shop}`);
      await db.session.deleteMany({ where: { shop } });
      break;
    
    case "CUSTOMERS_DATA_REQUEST":
      console.log(`Customer data request received for shop: ${shop}`);
      break;

    case "CUSTOMERS_REDACT":
      console.log(`Customer data redaction request received for shop: ${shop}`);
      break;

    case "SHOP_REDACT":
      console.log(`Shop data redaction request received for shop: ${shop}`);
      break;


    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  // Respond with 200 status code to acknowledge the webhook
  return new Response("Webhook handled", { status: 200 });
};
