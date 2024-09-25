import * as React from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  Text,
  TextStyle,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Loader to fetch product metafields using product ID
export const loader = async ({ params, request }) => {
  const { admin } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;

  // Query to fetch all metafields for the specific product
  const metafieldsQuery = `{
    product(id: "${productId}") {
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
      handle
    }
  }`;

  try {
    const productResponse = await admin.graphql(metafieldsQuery);
    const productData = productResponse.data.product;

    return json({
      product: productData,
      metafields: productData.metafields.edges,
    });
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return new Response("Error fetching data", { status: 500 });
  }
};

export default function ProductMetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;

  return (
    <Page title={`Metafields for ${product.handle}`}>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <h1>
              <Text>Product Metafields</Text>
            </h1>

            {metafields.length > 0 ? (
              <div>
                <table border="1" cellPadding="10" cellSpacing="0" width="100%">
                  <thead>
                    <tr>
                      <th>Namespace</th>
                      <th>Key</th>
                      <th>Value</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metafields.map(({ node }) => {
                      const { namespace, key, value, type } = node;
                      return (
                        <tr key={key}>
                          <td>{namespace}</td>
                          <td>{key}</td>
                          <td>{value}</td>
                          <td>{type}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <TextStyle variation="subdued">No metafields found for this product.</TextStyle>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
