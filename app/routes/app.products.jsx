import { Card, Frame, Layout, Page, Thumbnail, Text, DataTable } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({request}) => {
  const {admin} = await authenticate.admin(request);
  const response = await admin.graphql(`
    {
      products(first: 10) {
        edges {
          node {
            id
            title
            handle
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
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `);
  
  const responseJson = await response.json();
  return json(responseJson);
};

export default function Products() {
  const data = useLoaderData();
  console.log(data.data.products.edges);
  const products = data.data.products.edges;

  const rows = products.map(product => [
    <Thumbnail
      source={product.node.images.edges[0]?.node.originalSrc || ""}
      alt={product.node.images.edges[0]?.node.altText || 'Product Image'}
    />,
    product.node.title,
    product.node.status,
    product.node.variants.edges[0]?.node.price || ""
  ]);

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="h2" variant="HeadingMd">
                Products List
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "text", "text"]}
                headings={["Image", "Title", "Status", "Price"]}
                rows={rows}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
