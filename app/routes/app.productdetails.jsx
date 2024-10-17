import * as React from "react";
import { useFetcher, useLoaderData, useNavigate, Link } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useState, useEffect } from "react";
import "./css/productdetails.css";
import {
  Page,
  Layout,
  Frame,
  Button,
  Card,
  TextField,
  Modal,
  Toast,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const { shop } = session;
  const myShop = shop.replace(".myshopify.com", "");

  // Fetch the current billing details (active plan)
  const billingDate = new Date();
  const billingDetails = await billing.check();
  const billings = await admin.rest.resources.RecurringApplicationCharge.all({
    session: session,
  });
  console.log(billingDate);
  console.log(billings);
  console.log("check", billingDetails);

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
      billingDetails: billingDetails || null,
      subscription: billingDetails?.appSubscriptions?.[0],
      shopId: myShop, // Add shop ID here
      billings : billings,
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
  const billingDetails = data.billingDetails;
  const subscription = data.subscription;
  const shopId = data.shopId; // Receive shopId from loader
  const billings = data.billings;

  console.log(billings.data);
  console.log(subscription);
  let GENERATE_LIMIT = 0;
  if(subscription?.name === "Majik-Pro"){
    GENERATE_LIMIT = 100;
  }
  else if(subscription?.name === "Majik-Basic"){
    GENERATE_LIMIT = 5;
  }
  console.log(GENERATE_LIMIT); 

  const [selectedProducts, setSelectedProducts] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filteredProducts, setFilteredProducts] = React.useState(products);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isPricingModal, setIsPricingModal] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState("");
  const [showReviewbutton, setshowReviewbutton] = React.useState(false);

  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const toastMarkup = toastActive ? (
    <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
  ) : null;

  const errorBanner = errorMessage ? (
    <Banner status="critical">{errorMessage}</Banner>
  ) : null;

  const isMajikProPlan =
    subscription?.name === "Majik-Pro" || subscription?.name === "Majik-Basic"; // Check if the plan is Majik-Pro
  console.log(isMajikProPlan);
  const subscriptionUrl = shopId
    ? `https://admin.shopify.com/store/${shopId}/charges/majik/pricing_plans`
    : "";
  console.log(subscriptionUrl);

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

  React.useEffect(() =>{
    console.log("Render product details page");
  },[])

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
    // Check if the user has a valid subscription plan
    if (!isMajikProPlan) {
      // Show modal prompting the user to select a plan
      setIsPricingModal(true);
      setModalMessage("Please select a plan before generating metafields.");
      setshowReviewbutton(false); // Disable review button in this modal
      return;
    }

    // If the user has a valid plan, proceed with generating the metafields
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

  const handlePricingRedirect = () => {
    navigate("/app/pricing"); // Redirect to pricing page
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    if (showReviewbutton) {
      setToastMessage("Images uploaded successfully");
      setToastActive(true);
    }
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
                  <p>Generate Metadata</p>
                  <button
                    onClick={handleSubmit}
                    className={`generateButton ${selectedProducts.length === 0 ? "disabled" : ""}`}
                    disabled={selectedProducts.length === 0} 
                  >
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
          onClose={handleModalClose}
          title="Processing Metadata"
        >
          <p className="modalUploading">{modalMessage}</p>
        </Modal>

        <Modal
          open={isPricingModal}
          onClose={handleModalClose}
          title={showReviewbutton ? "Processing Metadata" : "Select a Plan"}
        >
          <p className="checkPricingplan">{modalMessage}</p>
          <div className="checkPricingButton">
            {!showReviewbutton && (
              <Button variant="primary" onClick={handlePricingRedirect}>
                Go to Pricing
              </Button>
            )}
          </div>
        </Modal>

        {toastMarkup}
        {errorBanner}
      </Page>
    </Frame>
  );
}
