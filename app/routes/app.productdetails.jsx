import * as React from "react";
import { useFetcher, useLoaderData, useNavigate,Link } from "@remix-run/react";
import { json } from "@remix-run/node";
import "./css/productdetails.css";
import {
  Page,
  Layout,
  Frame,
  Button,
  Card,
  TextField,
  Modal,
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filteredProducts, setFilteredProducts] = React.useState(products);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState("");
  const [showReviewbutton, setshowReviewbutton] = React.useState(false);
  React.useEffect(() => {
    if (searchQuery === "") {
      setFilteredProducts(products);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = products.filter((product) =>
        product.node.title.toLowerCase().includes(lowerCaseQuery),
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const handleCheckboxChange = (productId) => {
    setSelectedProducts((prevSelected) =>
      prevSelected.includes(productId)
        ? prevSelected.filter((id) => id !== productId)
        : [...prevSelected, productId],
    );
  };

  const downloadImageAsBase64 = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error downloading image:", error);
      return null;
    }
  };

  const extractImageName = (url) => {
    const parts = url.split("/");
    const fileName = parts[parts.length - 1].split("?")[0];
    return fileName;
  };

  const handleSubmit = async () => {
    setIsModalOpen(true);
    setModalMessage("Your products are being uploaded...");

    const selectedProductDetails = products
      .filter((product) => selectedProducts.includes(product.node.id))
      .map((product) => ({
        id: product.node.id,
        title: product.node.title,
        imageUrl: product.node.images.edges[0]?.node.originalSrc || "",
      }));

    const shopId = shopDetails.id;

    const base64Images = await Promise.all(
      selectedProductDetails.map(async (product) => {
        const base64Image = await downloadImageAsBase64(product.imageUrl);
        return {
          image_id: product.id,
          image_name: extractImageName(product.imageUrl),
          image_data: base64Image,
          product_source: "shopify",
          source_product_id: product.id,
        };
      }),
    );

    const payload = {
      customer_id: shopId,
      images: base64Images,
    };

    console.log(payload);

    try {
      const response = await fetch(
        "https://cartesian-api.plotch.io/catalog/genmetadata/image/upload",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log("API action success:", result);
        setModalMessage("Upload successful!. Check Review");
        setshowReviewbutton(true);
        setSelectedProducts([]);
      } else {
        console.error("Error from API:", result);
        setModalMessage("Error occurred during upload. Please try again.");
      }
    } catch (error) {
      console.error("Error during API request:", error);
      setModalMessage("Error occurred during upload. Please try again.");
    }
  };

  const navigate = useNavigate();
  
  const handleReviewNavigate = () => {
    navigate("/app/review");
  };

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <div className="products-container">
              <Card padding="300">
                <h2 className="products-title">All Products</h2>
                <div className="action-button-container">
                  <p>Select your products for Majik🪄</p>
                  {/* <Button onClick={handleSubmit} variant="primary"   style={{ fontSize: '18px', padding: '12px 24px', height: '50px' }}>
                    Generate Metadata🪄
                  </Button> */}
                  <button onClick={handleSubmit} className="generateButton">
                    Generate Metadata
                  </button>
                </div>
              </Card>
              <div className="search-bar">
                <TextField
                  value={searchQuery}
                  onChange={(value) => setSearchQuery(value)}
                  placeholder="Search by product name"
                />
              </div>
              <div className="products-list">
                {filteredProducts.map((product) => {
                  const variant = product.node.variants.edges[0]?.node;
                  const price = variant?.price ? `₹${variant.price}` : "";
                  const compareAtPrice = variant?.compareAtPrice
                    ? `₹${variant.compareAtPrice}`
                    : "";

                  return (
                    <div key={product.node.id} className="product-row">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.node.id)}
                        onChange={() => handleCheckboxChange(product.node.id)}
                        className="product-checkbox"
                      />
                      <div className="product-image">
                        <img
                          src={
                            product.node.images.edges[0]?.node.originalSrc || ""
                          }
                          alt={
                            product.node.images.edges[0]?.node.altText ||
                            "Product Image"
                          }
                        />
                      </div>
                      <div className="product-details">
                        <h3 className="product-title">{product.node.title}</h3>
                        <div className="pricedetail">
                          <p className="product-status">
                            {product.node.status}
                          </p>
                          <p className="product-price">{price}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Layout.Section>
        </Layout>
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Upload Status"
          primaryAction={{
            content: "Close",
            onAction: () => setIsModalOpen(false),
          }}
        >
          <Modal.Section>
            <p>{modalMessage}</p>
            {showReviewbutton && (
              <div className="reviewbutton">
                <Button variant="primary" onClick={handleReviewNavigate()}>
                <Link to="/app/review">Review</Link>
                  </Button>
              </div>
            )}
          </Modal.Section>
        </Modal>
      </Page>
    </Frame>
  );
}
