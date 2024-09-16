import { Card, Frame, Layout, Page, Thumbnail, Text, DataTable, Button, Checkbox } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";

export const loader = async ({request}) => {
  const {admin} = await authenticate.admin(request);

  const productResponse = await admin.graphql(`
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

  const userResponse = await admin.graphql(`
    {
      shop {
        id
        name
        email
      }
    }
  `);

  const productData = await productResponse.json();
  const userData = await userResponse.json();

  return json({
    products: productData,
    user: userData.shop,
  });
};

export default function Products() {
  const data = useLoaderData();
  const products = data.products.data.products.edges;
  const storeDetails = data.user;

  const [selectedProducts, setSelectedProducts] = useState([]);

  const handleCheckboxChange = (productId) => {
    setSelectedProducts((prevSelected) => {
      if (prevSelected.includes(productId)) {
        return prevSelected.filter((id) => id !== productId);
      } else {
        return [...prevSelected, productId];
      }
    });
  };

  const rows = products.map((product) => [
    <Checkbox
      checked={selectedProducts.includes(product.node.id)}
      onChange={() => handleCheckboxChange(product.node.id)}
    />,
    <Thumbnail
      source={product.node.images.edges[0]?.node.originalSrc || ""}
      alt={product.node.images.edges[0]?.node.altText || "Product Image"}
    />,
    product.node.title,
    product.node.status,
    product.node.variants.edges[0]?.node.price || "",
  ]);

  const handleSubmit = () => {
    const selectedProductDetails = products
      .filter((product) => selectedProducts.includes(product.node.id))
      .map((product) => ({
        id: product.node.id,
        title: product.node.title,
        price: product.node.variants.edges[0]?.node.price || "",
      }));

    console.log("Store Details:", storeDetails);
    console.log("Selected Products:", selectedProductDetails);
  };

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
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["Select", "Image", "Title", "Status", "Price"]}
                rows={rows}
              />
              <Button onClick={handleSubmit}>Submit</Button>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
