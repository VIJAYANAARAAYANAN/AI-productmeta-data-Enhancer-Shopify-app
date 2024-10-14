import { json, redirect } from "remix";
import { authenticate } from "@shopify/shopify-app-remix/server";
import prisma from "../../db.server";

async function storeNewShopDetails(session) {
  const shopDomain = session.shop;  // Store's shop domain
  const ownerEmail = session.email || "unknown"; // Handle email if available
  const plan = "free"; // Default to free plan 

  console.log("Storing new shop details:", { shopDomain, ownerEmail, plan });

  // Check if the store already exists
  const existingStore = await prisma.store.findUnique({
    where: { shopDomain },
  });

  console.log("Checking if store exists in the database:", { existingStore });

  if (!existingStore) {
    try {
      await prisma.store.create({
        data: {
          shopDomain,
          ownerEmail,
          plan,
          lastReset: new Date(),
          metafieldsCreated: 0,
        },
      });
      console.log("New store created successfully:", shopDomain);
    } catch (error) {
      console.error("Error creating new store in the database:", error);
    }
  } else {
    console.log(`Store ${shopDomain} already exists in the database.`);
  }
}

export const loader = async ({ request }) => {
  console.log("Loader function invoked."); // Log when loader is called
  const session = await authenticate(request); // Authenticate the user

  console.log("Authentication successful, session:", session); // Log session details

  // Store shop details after authentication
  await storeNewShopDetails(session);

  // Redirect to your app's main page after successful authentication
  return redirect("/");
};
