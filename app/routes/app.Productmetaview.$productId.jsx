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
  const { product, metafields} = data;
  console.log(product);
  console.log(metafields);
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
