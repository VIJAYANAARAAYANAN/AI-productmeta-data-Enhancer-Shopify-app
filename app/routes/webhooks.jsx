// import { authenticate } from "../shopify.server";


// export const action = async ({ request }) => {
//   const { topic, shop } = await authenticate.webhook(request);

//   // Handle different webhook topics
//   switch (topic) {
//     case "APP_UNINSTALLED":
//       console.log(`App uninstalled by shop: ${shop}`);
//       break;

//     case "CUSTOMERS_DATA_REQUEST":
//       console.log(`Customer data request received for shop: ${shop}`);
//       break;

//     case "CUSTOMERS_REDACT":
//       console.log(`Customer data redaction request received for shop: ${shop}`);
//       break;

//     case "SHOP_REDACT":
//       console.log(`Shop data redaction request received for shop: ${shop}`);
//       break;

//     default:
//       console.error("Unhandled webhook topic:", topic);
//       return new Response("Unhandled webhook topic", { status: 404 });
//   }

//   // Respond with 200 status code to acknowledge the webhook
//   return new Response("Webhook handled", { status: 200 });
// };
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { type ActionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export const action = async ({ request }: ActionArgs) => {
  const { topic, shop, session } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
      }
      break;

    case "CUSTOMERS_DATA_REQUEST":
      const dataRequestPayload = await request.json();
      const customerData = await prisma.customer.findMany({
        where: { shop },
      });
      return json({ status: "Customer data provided", data: customerData });

    case "CUSTOMERS_REDACT":
      const redactCustomerPayload = await request.json();
      await prisma.customer.deleteMany({
        where: { shop },
      });
      return json({ status: "Customer data redacted" });

    case "SHOP_REDACT":
      const redactShopPayload = await request.json();
      await prisma.shop.delete({
        where: { shop },
      });
      return json({ status: "Shop data redacted" });

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  return new Response();
};
