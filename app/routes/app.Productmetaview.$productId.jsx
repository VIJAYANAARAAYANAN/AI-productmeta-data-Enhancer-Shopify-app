import * as React from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ params, request }) => {
  const { admin } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;

  const metafieldsQuery = `
    query getProductById {
      product(id: "${productId}") {
        title
        metafields(first: 250) { 
          edges {
            node {
              namespace
              key
              value
              type
            }
          }
        }
      }
    }`;

  try {
    const productResponse = await admin.graphql(metafieldsQuery);
    console.log(productResponse);
    const productData = await productResponse.json();

    return json({
      product: productData.data.product,
      metafields: productData.data.product.metafields.edges,
    });
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return json({
      product: null,
      metafields: [],
    });
  }
};

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <h1>
            <Text variant="headingLg">Product Metafields</Text>
          </h1>

          {/* Display product title if available */}
          {product ? (
            <Text variant="headingMd" as="h2">
              {product.title}
            </Text>
          ) : (
            <Text>No product data available.</Text>
          )}

          {/* Check if metafields exist and display them in a simple format */}
          {metafields && metafields.length > 0 ? (
            metafields.map((field, index) => {
              if (!field.node) {
                return null; // Skip if node is invalid
              }
              const { key, value } = field.node; 
              return (
                <Text key={index}>
                  <strong>{key}</strong>: {value}
                </Text>
              );
            })
          ) : (
            <Text>No metafields available.</Text>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
