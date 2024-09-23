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
            metafields(first: 5) {  // Fetch the first 5 metafields and count
              edges {
                node {
                  id
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

  
  const rows = products.map((product) => {
    const variant = product.node.variants.edges[0]?.node;
    const price = variant?.price ? `₹${variant.price}` : "";
    const compareAtPrice = variant?.compareAtPrice
      ? `₹${variant.compareAtPrice}`
      : "";

    return [
      <div style={{ display: "flex", alignItems: "center" }}>

        <Thumbnail
          source={product.node.images.edges[0]?.node.originalSrc || ""}
          alt={product.node.images.edges[0]?.node.altText || "Product Image"}
          style={{ marginLeft: "8px" }}
        />
      </div>,
      product.node.title,
      product.node.status,
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
                  columnContentTypes={["text", "text", "text"]}
                  headings={["Products", "Status", "Metafields"]}
                  rows={rows}
                />
              </Card>
              <BlockStack gap="400">
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <Button variant="primary">
                    Majik🪄
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
