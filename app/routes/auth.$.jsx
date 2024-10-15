import { redirect } from "@remix-run/node"; // Import redirect
import { authenticate } from "../shopify.server";
import prisma from "../db.server"; // Ensure the path to your Prisma setup is correct

export const loader = async ({ request }) => {
  console.log("auth.$.jsx is being executed");

  try {
    // Authenticate the admin using Shopify's authentication logic
    const session = await authenticate.admin(request);

    console.log("Authenticated session:", session);

    // Extract shop domain and owner email from the session
    const shopDomain = session.shop;
    const ownerEmail = session.email || "unknown"; 
    const plan = "free"; // You can change this based on your logic

    // Check if the store already exists in the database
    const existingStore = await prisma.store.findUnique({
      where: { shopDomain },
    });

    if (!existingStore) {
      // If store does not exist, create a new record in the database
      await prisma.store.create({
        data: {
          shopDomain,
          ownerEmail,
          plan,               // Save the plan (e.g., 'free' or 'paid')
          lastReset: new Date(), // Add a field to track when the store was last reset
          metafieldsCreated: 0,  // Initialize metafields count at 0
        },
      });
      console.log("New store added to the database:", shopDomain);
    } else {
      console.log("Store already exists in the database:", shopDomain);
    }

    return redirect("/");  // Make sure redirect is now defined
  } catch (error) {
    console.error("Error during authentication or database operation:", error);

    return redirect("/auth/error");
  }
};
