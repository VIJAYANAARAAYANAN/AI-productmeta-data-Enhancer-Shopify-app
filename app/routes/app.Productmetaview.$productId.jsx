import * as React from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  Text,
  Stack,
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
          <Card sectioned>
            <h1>
              <Text variant="headingLg">Product Metafields</Text>
            </h1>

            {product && (
              <Text variant="headingMd" as="h2">
                {product.title}
              </Text>
            )}

            {metafields && metafields.length > 0 ? (
              metafields.map((field, index) => {
                const { key, value } = field.node; 
                return (
                  <Card.Section key={index}>
                    <Stack vertical spacing="tight">
                      <Stack.Item>
                        <Text variant="headingSm" as="h3">
                          Key: <strong>{key}</strong>
                        </Text>
                      </Stack.Item>
                      <Stack.Item>
                        <Text>
                          Value: <strong>{value}</strong>
                        </Text>
                      </Stack.Item>
                    </Stack>
                  </Card.Section>
                );
              })
            ) : (
              <Text>No metafields available.</Text>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
