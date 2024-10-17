// import * as React from "react";
// import { useFetcher, useLoaderData, useNavigate, Link } from "@remix-run/react";
// import { json } from "@remix-run/node";
// import { useState, useEffect } from "react";
// import "./css/productdetails.css";
// import {
//   Page,
//   Layout,
//   Frame,
//   Button,
//   Card,
//   TextField,
//   Modal,
//   Toast,
// } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";

// export const loader = async ({ request }) => {
//   const { admin, billing, session } = await authenticate.admin(request);
//   const { shop } = session;
//   const myShop = shop.replace(".myshopify.com", "");

//   // Fetch the current billing details (active plan)
//   const billingDate = new Date();
//   const billingDetails = await billing.check();
//   const billings = await admin.rest.resources.RecurringApplicationCharge.all({
//     session: session,
//   });
//   console.log(billingDate);
//   console.log(billings);
//   console.log("check", billingDetails);

//   const productQuery = `
//     {
//       products(first: 250) {
//         edges {
//           node {
//             id
//             title
//             status
//             images(first: 1) {
//               edges {
//                 node {
//                   originalSrc
//                   altText
//                 }
//               }
//             }
//             variants(first: 10) {
//               edges {
//                 node {
//                   id
//                   price
//                   compareAtPrice
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   const shopQuery = `
//     {
//       shop {
//         id
//         name
//         email
//       }
//     }
//   `;

//   try {
//     const productResponse = await admin.graphql(productQuery);
//     const shopResponse = await admin.graphql(shopQuery);
//     const products = await productResponse.json();
//     const shop = await shopResponse.json();

//     return json({
//       products: products.data,
//       shop: shop.data.shop,
//       billingDetails: billingDetails || null,
//       subscription: billingDetails?.appSubscriptions?.[0],
//       shopId: myShop, // Add shop ID here
//     });
//   } catch (error) {
//     console.error("Error fetching products or shop details:", error);
//     return new Response("Error fetching data", { status: 500 });
//   }
// };

// export default function Products() {
//   const data = useLoaderData();
//   const fetcher = useFetcher();
//   const products = data.products?.products.edges || [];
//   const shopDetails = data.shop;
//   const billingDetails = data.billingDetails;
//   const subscription = data.subscription;
//   const shopId = data.shopId; // Receive shopId from loader

//   const [selectedProducts, setSelectedProducts] = React.useState([]);
//   const [searchQuery, setSearchQuery] = React.useState("");
//   const [filteredProducts, setFilteredProducts] = React.useState(products);
//   const [isModalOpen, setIsModalOpen] = React.useState(false);
//   const [isPricingModal, setIsPricingModal] = React.useState(false);
//   const [modalMessage, setModalMessage] = React.useState("");
//   const [showReviewbutton, setshowReviewbutton] = React.useState(false);

//   const [toastActive, setToastActive] = useState(false);
//   const [toastMessage, setToastMessage] = useState("");
//   const [errorMessage, setErrorMessage] = useState("");

//   const toastMarkup = toastActive ? (
//     <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
//   ) : null;

//   const errorBanner = errorMessage ? (
//     <Banner status="critical">{errorMessage}</Banner>
//   ) : null;

//   const isMajikProPlan =
//     subscription?.name === "Majik-Pro" || subscription?.name === "Majik-Basic"; // Check if the plan is Majik-Pro
//   console.log(isMajikProPlan);
//   const subscriptionUrl = shopId
//     ? `https://admin.shopify.com/store/${shopId}/charges/majik/pricing_plans`
//     : "";
//   console.log(subscriptionUrl);

//   React.useEffect(() => {
//     if (searchQuery === "") {
//       setFilteredProducts(products);
//     } else {
//       const lowerCaseQuery = searchQuery.toLowerCase();
//       const filtered = products.filter((product) =>
//         product.node.title.toLowerCase().includes(lowerCaseQuery),
//       );
//       setFilteredProducts(filtered);
//     }
//   }, [searchQuery, products]);

//   //USE EFFECT THAT CAN BE USED TO SEND THE DATA OF THE STORE THROUGH THE API
//   React.useEffect(() =>{
//     console.log("Render product details page");
//   },[])

//   const handleCheckboxChange = (productId) => {
//     setSelectedProducts((prevSelected) =>
//       prevSelected.includes(productId)
//         ? prevSelected.filter((id) => id !== productId)
//         : [...prevSelected, productId],
//     );
//   };

//   const downloadImageAsBase64 = async (imageUrl) => {
//     try {
//       const response = await fetch(imageUrl);
//       const blob = await response.blob();
//       return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onloadend = () => resolve(reader.result.split(",")[1]);
//         reader.onerror = reject;
//         reader.readAsDataURL(blob);
//       });
//     } catch (error) {
//       console.error("Error downloading image:", error);
//       return null;
//     }
//   };

//   const extractImageName = (url) => {
//     const parts = url.split("/");
//     const fileName = parts[parts.length - 1].split("?")[0];
//     return fileName;
//   };

//   const handleSubmit = async () => {
//     // Check if the user has a valid subscription plan
//     if (!isMajikProPlan) {
//       // Show modal prompting the user to select a plan
//       setIsPricingModal(true);
//       setModalMessage("Please select a plan before generating metafields.");
//       setshowReviewbutton(false); // Disable review button in this modal
//       return;
//     }

//     // If the user has a valid plan, proceed with generating the metafields
//     setIsModalOpen(true);
//     setModalMessage("Your products are being uploaded...");

//     const selectedProductDetails = products
//       .filter((product) => selectedProducts.includes(product.node.id))
//       .map((product) => ({
//         id: product.node.id,
//         title: product.node.title,
//         imageUrl: product.node.images.edges[0]?.node.originalSrc || "",
//       }));

//     const shopId = shopDetails.id;

//     const base64Images = await Promise.all(
//       selectedProductDetails.map(async (product) => {
//         const base64Image = await downloadImageAsBase64(product.imageUrl);
//         return {
//           image_id: product.id,
//           image_name: extractImageName(product.imageUrl),
//           image_data: base64Image,
//           product_source: "shopify",
//           source_product_id: product.id,
//         };
//       }),
//     );

//     const payload = {
//       customer_id: shopId,
//       images: base64Images,
//     };

//     console.log(payload);

//     try {
//       const response = await fetch(
//         "https://cartesian-api.plotch.io/catalog/genmetadata/image/upload",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(payload),
//         },
//       );

//       const result = await response.json();

//       if (response.ok) {
//         console.log("API action success:", result);
//         setModalMessage("Upload successful!. Check Review");
//         setshowReviewbutton(true);
//         setSelectedProducts([]);
//       } else {
//         console.error("Error from API:", result);
//         setModalMessage("Error occurred during upload. Please try again.");
//       }
//     } catch (error) {
//       console.error("Error during API request:", error);
//       setModalMessage("Error occurred during upload. Please try again.");
//     }
//   };

//   const navigate = useNavigate();

//   const handleReviewNavigate = () => {
//     navigate("/app/review");
//   };

//   const handlePricingRedirect = () => {
//     navigate("/app/pricing"); // Redirect to pricing page
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     if (showReviewbutton) {
//       setToastMessage("Images uploaded successfully");
//       setToastActive(true);
//     }
//   };

//   return (
//     <Frame>
//       <Page fullWidth>
//         <Layout>
//           <Layout.Section>
//             <div className="products-container">
//               <Card padding="300">
//                 <h2 className="products-title">All Products</h2>
//                 <div className="action-button-container">
//                   <p>Generate Metadata</p>
//                   <button
//                     onClick={handleSubmit}
//                     className={`generateButton ${selectedProducts.length === 0 ? "disabled" : ""}`}
//                     disabled={selectedProducts.length === 0}
//                   >
//                     Generate Metadata
//                   </button>
//                 </div>
//               </Card>
//               <div className="search-bar">
//                 <TextField
//                   value={searchQuery}
//                   onChange={(value) => setSearchQuery(value)}
//                   placeholder="Search by product name"
//                 />
//               </div>
//               <div className="products-list">
//                 {filteredProducts.map((product) => {
//                   const variant = product.node.variants.edges[0]?.node;
//                   const price = variant?.price ? `₹${variant.price}` : "";
//                   const compareAtPrice = variant?.compareAtPrice
//                     ? `₹${variant.compareAtPrice}`
//                     : "";

//                   return (
//                     <div key={product.node.id} className="product-row">
//                       <input
//                         type="checkbox"
//                         checked={selectedProducts.includes(product.node.id)}
//                         onChange={() => handleCheckboxChange(product.node.id)}
//                         className="product-checkbox"
//                       />
//                       <div className="product-image">
//                         <img
//                           src={
//                             product.node.images.edges[0]?.node.originalSrc || ""
//                           }
//                           alt={
//                             product.node.images.edges[0]?.node.altText ||
//                             "Product Image"
//                           }
//                         />
//                       </div>
//                       <div className="product-details">
//                         <h3 className="product-title">{product.node.title}</h3>
//                         <div className="pricedetail">
//                           <p className="product-status">
//                             {product.node.status}
//                           </p>
//                           <p className="product-price">{price}</p>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </Layout.Section>
//         </Layout>
//         <Modal
//           open={isModalOpen}
//           onClose={handleModalClose}
//           title="Processing Metadata"
//         >
//           <p className="modalUploading">{modalMessage}</p>
//         </Modal>

//         <Modal
//           open={isPricingModal}
//           onClose={handleModalClose}
//           title={showReviewbutton ? "Processing Metadata" : "Select a Plan"}
//         >
//           <p className="checkPricingplan">{modalMessage}</p>
//           <div className="checkPricingButton">
//             {!showReviewbutton && (
//               <Button variant="primary" onClick={handlePricingRedirect}>
//                 Go to Pricing
//               </Button>
//             )}
//           </div>
//         </Modal>

//         {toastMarkup}
//         {errorBanner}
//       </Page>
//     </Frame>
//   );
// }

import * as React from "react";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
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
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const { shop } = session;
  const myShop = shop.replace(".myshopify.com", "");

  const billingDetails = await billing.check();

  const billingId =
    billingDetails?.appSubscriptions?.[0]?.id?.split("/").pop() || "";

  let billings = "";
  if (billingId) {
    billings = await admin.rest.resources.RecurringApplicationCharge.find({
      session: session,
      id: billingId,
    });
  }
  console.log(billings);

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
    const shopData = await shopResponse.json();

    return json({
      products: products.data?.products?.edges || [],
      shop: shopData.data?.shop || {},
      billingDetails: billingDetails || null,
      subscription: billingDetails?.appSubscriptions?.[0] || {},
      shopId: myShop,
      billings: billings || "",
    });
  } catch (error) {
    console.error("Error fetching products or shop details:", error);
    return new Response("Error fetching data", { status: 500 });
  }
};

export default function Products() {
  const {
    products = [],
    shop = {},
    subscription = {},
    shopId = "",
    billings = {},
  } = useLoaderData();

  console.log("Subscription data:", subscription);
  console.log("Shop ID:", shopId);
  console.log("Billings:", billings);
  console.log("The billing is done on date :", billings.billing_on);

  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPricingModal, setIsPricingModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showReviewButton, setShowReviewButton] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [totalCount, setTotalCount] = useState(null);
  const isMajikProPlan = subscription?.name === "Majik-Pro";
  const isMajikBasicPlan = subscription?.name === "Majik-Basic"; // Check if the plan is Majik-Basic
  const GENERATE_LIMIT = isMajikProPlan
    ? 100
    : isMajikBasicPlan || subscription?.name === "Free"
      ? 5
      : 0;

  useEffect(() => {
    if (searchQuery === "") {
      setFilteredProducts(products);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = products.filter((product) =>
        product.node?.title?.toLowerCase().includes(lowerCaseQuery),
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  //USE EFFECT TO FETCHE THE TOTAL REMAINING CREDIT POINTS OF THE USER
  let countResult;
  useEffect(() => {
    const fetchcount = async () => {
      try {
        console.log("Fetching request count...");

        // Make sure billing_on is a valid Date object
        const billingOnDate = billings.billing_on;
        const startDate = new Date(billingOnDate);
        startDate.setDate(startDate.getDate() - 30);
        const billingDate = startDate;
        console.log("Billing date", billingDate);

        const responseCount = await fetch(
          "https://cartesian-api.plotch.io/catalog/shopify/retrieverequest",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              store_id: shopId,
              date: billingDate.toISOString().split("T")[0], // Correct format
            }),
          },
        );

        if (!responseCount.ok) {
          throw new Error("Failed to fetch request count");
        }

        countResult = await responseCount.json();
        console.log("Request count result:", countResult);
        console.log("COUNT", countResult.total_count);
        setTotalCount(countResult.total_count);
        // Process the countResult as needed
      } catch (error) {
        console.error("Error fetching request count:", error);
      }
    };

    fetchcount();
  }, []); // Add dependencies to ensure they are available

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

  const extractImageName = (url) => url.split("/").pop().split("?")[0];

  const handleSubmit = async () => {
    console.log("handleSubmit triggered");

    // Check if user is on the Majik-Pro plan
    if (!isMajikProPlan && !isMajikBasicPlan && subscription?.name !== "Free") {
      console.log("User is not on a valid plan. Showing pricing modal.");
      setIsPricingModal(true);
      setModalMessage("Please select a plan before generating metafields.");
      setShowReviewButton(false);
      return;
    }

    console.log("User is on Majik-Pro plan. Proceeding with upload.");
    setIsModalOpen(true);
    setModalMessage("Your products are being uploaded...");

    // Filter and map selected products
    const selectedProductDetails = products
      .filter((product) => selectedProducts.includes(product.node?.id))
      .map((product) => ({
        id: product.node?.id,
        title: product.node?.title,
        imageUrl: product.node?.images?.edges?.[0]?.node?.originalSrc || "",
      }));

    console.log("Selected products:", selectedProductDetails);

    try {
      const base64Images = await Promise.all(
        selectedProductDetails.map(async (product) => {
          console.log("Processing product:", product);
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

      console.log("Base64 encoded images:", base64Images);
      console.log("The length of the base64images is ", base64Images.length);

      const payload = {
        customer_id: shopId,
        images: base64Images,
      };

      console.log("Payload to be sent:", payload);

      // Get billing date and check requests count
      const billingOnDate = billings.billing_on;
      const startDate = new Date(billingOnDate);
      startDate.setDate(startDate.getDate() - 30);
      console.log("Start date for request count:", startDate);

      let responseCount;
      try {
        console.log("Fetching request count...");
        responseCount = await fetch(
          "https://cartesian-api.plotch.io/catalog/shopify/retrieverequest",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              store_id: shopId,
              date: startDate.toISOString().split("T")[0],
            }),
          },
        );
      } catch (error) {
        console.error("Error fetching request count:", error);
        setModalMessage("Data Retrieve failed! Try again");
        return;
      }

      const countResult = await responseCount.json();
      console.log("Request count result:", countResult);

      const totalCount = parseInt(countResult.total_count, 10);
      console.log("Total count of previous requests:", totalCount);
      console.log("Total available count:", GENERATE_LIMIT);
      console.log("The count of the current request is :", base64Images.length);
      if (totalCount + base64Images.length > GENERATE_LIMIT) {
        console.log("INSUFFICIENT CREDITS");
        setModalMessage("INSUFFICIENT CREDITS");
        return;
      }

      // Upload images and metadata
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

      if (response.ok) {
        console.log("Image upload successful");

        // Store request data
        try {
          console.log("Storing request data...");
          await fetch(
            "https://cartesian-api.plotch.io/catalog/shopify/storerequest",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                store_id: shopId,
                data: payload.images,
                data_count: payload.images.length,
              }),
            },
          );
          setModalMessage("Upload successful! Check Review");
          console.log("Data stored successfully.");
        } catch (error) {
          console.error("Error during storerequest API call:", error);
          setModalMessage("Data upload failed!");
          return;
        }

        // Final state updates
        setModalMessage("Upload successful! Check Review");
        setShowReviewButton(true);
        setSelectedProducts([]);
      } else {
        console.error(
          "Error occurred during image upload:",
          response.statusText,
        );
        setModalMessage("Error occurred during upload. Please try again.");
      }
    } catch (error) {
      console.error("Error during API request:", error);
      setModalMessage("Error occurred during upload. Please try again.");
    }
  };

  const handleReviewNavigate = () => navigate("/app/review");
  const handlePricingRedirect = () => {
    navigate("/app/pricing"); // Redirect to pricing page
  };
  const handleModalClose = () => setIsModalOpen(false);

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <div className="products-container">
              <Card padding="300">
                <div>
                  <div className="remainCredits">
                    <p>
                      <span>(Available Generation)</span>
                    </p>
                    <div className="badge">
                      {totalCount} / {GENERATE_LIMIT}
                    </div>
                  </div>
                  <h2 className="products-title">All Products</h2>
                </div>
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
                <div className="search-bar">
                  <TextField
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(value)}
                    placeholder="Search by product name"
                  />
                </div>
              </Card>
              <div className="products-list">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
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
                              product.node.images.edges[0]?.node.originalSrc ||
                              ""
                            }
                            alt={
                              product.node.images.edges[0]?.node.altText ||
                              "Product Image"
                            }
                          />
                        </div>
                        <div className="product-details">
                          <h3 className="product-title">
                            {product.node.title}
                          </h3>
                          <div className="pricedetail">
                            <p className="product-status">
                              {product.node.status}
                            </p>
                            <p className="product-price">{price}</p>
                            {/* {compareAtPrice && (
                              <p className="product-compare-price">
                                {compareAtPrice}
                              </p>
                            )} */}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p>No products found.</p>
                )}
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
          title={showReviewButton ? "Processing Metadata" : "Select a Plan"} // Corrected casing here
        >
          <p className="checkPricingplan">{modalMessage}</p>
          <div className="checkPricingButton">
            {!showReviewButton && ( // Corrected casing here
              <Button variant="primary" onClick={handlePricingRedirect}>
                Go to Pricing
              </Button>
            )}
          </div>
        </Modal>

        {toastActive && (
          <Toast
            content={toastMessage}
            onDismiss={() => setToastActive(false)}
            duration={5000}
          />
        )}
        {errorMessage && <div className="errorBanner">{errorMessage}</div>}
      </Page>
    </Frame>
  );
}
