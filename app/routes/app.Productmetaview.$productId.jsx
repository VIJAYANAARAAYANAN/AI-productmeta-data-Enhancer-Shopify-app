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

// Loader to fetch product metafields using product ID
export const loader = async ({ params, request }) => {
  const { admin } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;

  // Query to fetch all metafields for the specific product
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
    const productData = productResponse;

    return json({
      product: productData,
      metafields: productData,
      query: metafieldsQuery,
      res: productResponse
    });
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return json({
      product: null,
      metafields: [],
      query: metafieldsQuery,
      res: { errors: [error.message] },
    });
  }
};

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields, query, res } = data;
  console.log(product);
  console.log(metafields);
  console.log(query);
  console.log(res);
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <h1>
              <Text>Product Metafields</Text>
            </h1>

          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
