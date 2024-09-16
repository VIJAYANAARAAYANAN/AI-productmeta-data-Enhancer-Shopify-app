// app/routes/api/createMetaobjects.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.json();
  const selectedProducts = formData.selectedProducts || [];

  try {
    for (const product of selectedProducts) {
      await createMetaobject(admin, product.id);
    }
    return json({ success: true });
  } catch (error) {
    console.error("Error creating metaobjects:", error);
    return new Response("Error creating metaobjects", { status: 500 });
  }
};

const createMetaobject = async (admin, productId) => {
  const mutation = `
    mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject {
          handle
          season: field(key: "season") {
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      metaobject: {
        type: "lookbook",
        handle: `product-${productId}`,
        fields: [
          { key: "season", value: "summer" },
          { key: "color", value: "blue" },
          { key: "material", value: "cotton" }
        ]
      }
    },
  });

  const result = await response.json();
  if (result.errors || result.metaobjectCreate.userErrors.length) {
    console.error("Metaobject creation errors for product ID:", productId, result.metaobjectCreate.userErrors);
  }
};
