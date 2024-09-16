import * as React from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  DataTable,
  Frame,
  Thumbnail,
  Checkbox,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Loader function to fetch products
export const loader = async ({ request }) => {
  console.log("Executing loader to fetch products");
  const { admin } = await authenticate.admin(request);
  const query = `
    {
   products(first: 250) {
        edges {
          node {
            id
            title
            status
            images(first: 1) {
              edges {
                node {
                  originalSrc
                  altText
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  compareAtPrice
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    console.log("Sending GraphQL request to fetch products");
    const response = await admin.graphql(query);
    const responseJson = await response.json();
    console.log("Products fetched successfully:", responseJson.data);
    return json(responseJson.data);
  } catch (error) {
    console.error("Error fetching products:", error);
    return new Response("Error fetching products", { status: 500 });
  }
};

// Function to add metafields to each product
// Function to add structured metafields to each product
const createMetafield = async (admin, productId) => {
  console.log(`Adding metafields for product ID: ${productId}`);
  
  const mutation = `
    mutation {
      productUpdate(
        input: {
          id: "${productId}",
          metafields: [
            {
              namespace: "custom_data",
              key: "Cloth",
              value: "Denim Jeans",
              type: "single_line_text_field"
            },
            {
              namespace: "custom_data",
              key: "Cleaning",
              value: "Wet Washing",
              type: "single_line_text_field"
            },
          ]
        }
      ) {
        product {
          id
          metafields(first: 10) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(mutation);
    const result = await response.json();
    
    // Log the entire response to debug
    // console.log("GraphQL Response:", result);

    if (result.errors) {
      console.error("GraphQL Errors:", result.errors);
    } else if (result.productUpdate && result.productUpdate.userErrors) {
      if (result.productUpdate.userErrors.length > 0) {
        console.error("Metafields creation errors for product ID:", productId, result.productUpdate.userErrors);
      } else {
        console.log("Metafields created successfully for product ID:", productId);
      }
    } else {
      console.error("Unexpected response structure:", result);
    }
  } catch (error) {
    console.error("Error creating metafields for product ID:", productId, error);
  }
};



// Action function to handle form submission
// Action function to handle form submission
export const action = async ({ request }) => {
  console.log("Action triggered for product selection");
  const { admin } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const selectedProducts = JSON.parse(formData.get("selectedProducts") || "[]");

  console.log("Selected products for metafield creation:", selectedProducts);

  try {
    for (const product of selectedProducts) {
      console.log("Creating metafields for product:", product.id);
      await createMetafield(admin, product.id);
    }
  } catch (error) {
    console.error("Error during metafield creation process:", error);
    return new Response("Error creating metafields", { status: 500 });
  }

  console.log("Metafield creation completed successfully for all selected products");
  return json({ success: true });
};


// React component to display products
export default function Products() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const products = data.products?.edges || [];
  const [selectedProducts, setSelectedProducts] = React.useState([]);
  React.useEffect(() => {
    if (fetcher.state === 'submitting') {
      console.log("Fetcher is submitting");
    } else if (fetcher.state === 'loading') {
      console.log("Fetcher is loading");
    } else if (fetcher.state === 'idle') {
      console.log("Fetcher is idle");
    }
  }, [fetcher.state]);
  const handleCheckboxChange = React.useCallback((productId) => {
    console.log(`Checkbox change detected for product ID: ${productId}`);
    setSelectedProducts((prevSelected) =>
      prevSelected.includes(productId)
        ? prevSelected.filter((id) => id !== productId)
        : [...prevSelected, productId]
    );
    console.log("Current selected products:", selectedProducts);
  }, [selectedProducts]);

  const handleSelectProducts = () => {
    console.log("Submit button clicked");
    const selectedProductDetails = products
      .filter((product) => selectedProducts.includes(product.node.id))
      .map((product) => ({
        id: product.node.id,
        title: product.node.title,
      }));

    console.log("Selected product details for submission:", selectedProductDetails);

    fetcher.submit(
      { selectedProducts: JSON.stringify(selectedProductDetails) },
      { method: 'post' , action: '/app/products' }
    );
    console.log(fetcher.state); // It will be "submitting" when a form is being submitted

    console.log("Submitted selected products for metaobject creation");
  };

  const rows = products.map((product) => {
    const variant = product.node.variants.edges[0]?.node;
    const price = variant?.price ? `₹${variant.price}` : "";
    const compareAtPrice = variant?.compareAtPrice
      ? `₹${variant.compareAtPrice}`
      : "";

    return [
      <div style={{ display: "flex", alignItems: "center" }}>
        <Checkbox
          label=""
          checked={selectedProducts.includes(product.node.id)}
          onChange={() => handleCheckboxChange(product.node.id)}
        />
        <Thumbnail
          source={product.node.images.edges[0]?.node.originalSrc || ""}
          alt={product.node.images.edges[0]?.node.altText || "Product Image"}
          style={{ marginLeft: "8px" }}
        />
      </div>,
      product.node.title,
      product.node.status,
      `${price} ${compareAtPrice ? `(Compare at ${compareAtPrice})` : ""}`
    ];
  });

  // console.log("Rendering product table with rows:", rows);

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card padding="800">
                <Text as="h2" alignment="left" variant="headingLg">
                  Products List
                </Text>
              </Card>
              <Card style={{ height: "500px", overflowY: "scroll" }}>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Image", "Title", "Status", "Price"]}
                  rows={rows}
                />
              </Card>
              <BlockStack gap="400">
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <Button onClick={handleSelectProducts} variant="primary">
                    Submit Selected Products
                  </Button>
                </div>
              </BlockStack>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
