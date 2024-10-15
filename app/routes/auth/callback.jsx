import { redirect } from "remix";
import { authenticate } from "@shopify/shopify-app-remix/server"; 
import prisma from "../../db.server"; // Adjust the path to your prisma instance if needed

// Function to store new shop details after authentication
async function storeNewShopDetails(session) {

  console.log("Callback route triggered");
  
  const shopDomain = session.shop;
  const ownerEmail = session.email || "unknown";
  const plan = "free"; // Default plan

  console.log("Storing new shop details:", { shopDomain, ownerEmail, plan });

  // Check if store already exists in the database
  const existingStore = await prisma.store.findUnique({
    where: { shopDomain },
  });

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
    console.log(`Store ${shopDomain} already exists.`);
  }
}

// Loader function triggered on callback route
export const loader = async ({ request }) => {
  console.log("Callback route accessed."); // Log when the callback is hit
  console.log("Request URL:", request.url); // Log the request URL

  try {
    const session = await authenticate(request); // Authenticate with Shopify
    console.log("Session details:", session); // Log session details
    
    // Store the shop's details in the database
    await storeNewShopDetails(session);
    
    // Redirect to the main page of your app after successful authentication
    return redirect("/");
  } catch (error) {
    console.error("Error in callback:", error);
    return redirect("/auth/error"); // Redirect to error page if something goes wrong
  }
};
