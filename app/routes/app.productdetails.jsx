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

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const productQuery = `
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

  const shopQuery = `
    {
      shop {
        id
        name
        email
      }
    }
  `;

  try {
    const productResponse = await admin.graphql(productQuery);
    const shopResponse = await admin.graphql(shopQuery);
    const products = await productResponse.json();
    const shop = await shopResponse.json();

    return json({
      products: products.data,
      shop: shop.data.shop,
    });
  } catch (error) {
    console.error("Error fetching products or shop details:", error);
    return new Response("Error fetching data", { status: 500 });
  }
};

export default function Products() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const products = data.products?.products.edges || [];
  const shopDetails = data.shop;
  const [selectedProducts, setSelectedProducts] = React.useState([]);

  const handleCheckboxChange = (productId) => {
    setSelectedProducts((prevSelected) =>
      prevSelected.includes(productId)
        ? prevSelected.filter((id) => id !== productId)
        : [...prevSelected, productId]
    );
  };

  const downloadImageAsBase64 = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    const selectedProductDetails = products
      .filter((product) => selectedProducts.includes(product.node.id))
      .map((product) => ({
        id: product.node.id,
        title: product.node.title,
        imageUrl: product.node.images.edges[0]?.node.originalSrc || "",
        imageName: product.node.title.replace(/\s+/g, '_').toLowerCase(),
      }));

    const shopId = shopDetails.id;

    const base64Images = await Promise.all(
      selectedProductDetails.map(async (product) => {
        const base64Image = await downloadImageAsBase64(product.imageUrl);
        return {
          image_name: product.imageName,
          image_data: base64Image,
        };
      })
    );

    const payload = {
      customer_id: shopId,
      images: base64Images,
    };
    console.log(JSON.stringify(payload));
    try {
      const response = await fetch('https://cartesian-api.plotch.io/catalog/genmetadata/image/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('API action success:', result);
      } else {
        console.error('Error from API:', result);
      }
    } catch (error) {
      console.error('Error during API request:', error);
    }
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
      `${price} ${compareAtPrice ? `(Compare at ${compareAtPrice})` : ""}`,
    ];
  });

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
                  <Button onClick={handleSubmit} variant="primary">
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
