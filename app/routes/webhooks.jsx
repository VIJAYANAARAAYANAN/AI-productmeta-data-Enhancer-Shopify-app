import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop } = await authenticate.webhook(request);
    const requestBody = await request.text();
    console.log(`Incoming webhook request: ${requestBody}`);

    switch (topic) {
      case "APP_UNINSTALLED":
        console.log(`App uninstalled by shop: ${shop}`);
        // await db.session.deleteMany({ where: { shop } });
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

    return new Response("Webhook handled", { status: 200 });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
