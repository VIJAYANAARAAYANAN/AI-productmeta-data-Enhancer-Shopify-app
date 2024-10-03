import * as React from "react";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import { json } from "@remix-run/node";
import "./css/metafields.css"; // Updated styles will go here
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Frame,
  Thumbnail,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Modified product query to include metafield count
  const productQuery = `{
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
          metafields(first: 200) {
            edges {
              node {
                namespace
                key
              }
            }
          }
        }
      }
    }
  }`;

  try {
    const productResponse = await admin.graphql(productQuery);
    const products = await productResponse.json();

    return json({
      products: products.data.products.edges,
    });
  } catch (error) {
    console.error("Error fetching products or shop details:", error);
    return new Response("Error fetching data", { status: 500 });
  }
};

const handleProductClick = (product_id) => {
  console.log("Product has been clicked", product_id);
};

export default function Products() {
  const data = useLoaderData();
  const products = data.products || [];
  const [searchText, setSearchText] = React.useState("");

  const filteredProducts = products.filter((product) =>
    product.node.title.toLowerCase().includes(searchText.toLowerCase()),
  );

  console.log("Products", filteredProducts);

  return (
    <Frame>
      <Page>
        <Layout>
          <Layout.Section>
            <div className="product-list-container">
              {/* Heading */}
              <BlockStack gap="200">
                <Card padding="400" className="product-heading">
                  <h3 className="product-top">Products Metadata</h3>
                </Card>

                {/* Search Bar */}
                <div className="search-bar">
                  <TextField
                    value={searchText}
                    onChange={(value) => setSearchText(value)}
                    placeholder="Search by product name"
                    clearButton
                    onClearButtonClick={() => setSearchText("")}
                  />
                </div>

                {/* Product List using Divs */}
                <Card padding="0" className="product-body">
                  <div className="product-head">
                    <div className="product-head-details">
                      <span className="product-headtitle">Product</span>
                    </div>
                    <div className="shead-tatusmeta">
                      <div className="product-headstatus">Status</div>
                      <div className="product-headmeta">Metafields</div>
                    </div>
                  </div>

                  <div className="product-list">
                    {filteredProducts.length === 0 ? (
                      <div className="no-products-found">
                        No product found
                      </div>
                    ) : (
                      filteredProducts.map((product, index) => {
                        const imageUrl =
                          product.node.images.edges[0]?.node.originalSrc || "";
                        const altText =
                          product.node.images.edges[0]?.node.altText ||
                          "Product Image";
                        const status = product.node.status;
                        const metafieldsCount =
                          product.node.metafields.edges.length;
                        const navid = product.node.id.split("/").pop();

                        return (
                          <div
                            key={index}
                            className="product-row"
                            onClick={() => handleProductClick(product.node.id)}
                          >
                            <Link
                              to={`/app/Productmetaview/${navid}`}
                              className="product-row"
                            >
                              {/* Thumbnail and Product Title */}
                              <div className="product-details">
                                <Thumbnail
                                  source={imageUrl}
                                  alt={altText}
                                  className="product-thumbnail"
                                />
                                <span className="rowproduct-title">
                                  {product.node.title}
                                </span>
                              </div>
                              <div className="statusmeta">
                                {/* Status */}
                                <div className="product-status">{status}</div>

                                {/* Metafields Count */}
                                <div className="product-metafields">
                                  {metafieldsCount} metafields
                                </div>
                              </div>
                            </Link>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
