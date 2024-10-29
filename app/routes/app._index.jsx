import { useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Modal,
  Spinner,
} from "@shopify/polaris";

import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useNavigate } from "react-router-dom";
import { TitleBar } from "@shopify/app-bridge-react";
import loadingGif from "./assets/loader.gif";
import "./css/index.css";
import onlinestore from "./assets/OnlineStore.png";
import themeSelection from "./assets/ThemeSelection.png";
import addBlock from "./assets/EditedAddblock.png";
import mergedblock from "./assets/editedmergedimg.png";
import metafieldshow from "./assets/metashowstore.png";
import { authenticate } from "../shopify.server";
import { clear } from "console";

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
  console.log(
    "Billing details of the users that have been received on the index page",
    billings,
  );

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
    const shopResponse = await admin.graphql(shopQuery);
    const shopData = await shopResponse.json();

    return json({
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

export default function Index() {
  const {
    products = [],
    shop = {},
    subscription = {},
    shopId = "",
    billings = {},
  } = useLoaderData();

  useEffect(() => {
    console.log("Products:", products);
    console.log("Shop Details:", shop);
    console.log("Subscription Details:", subscription);
    console.log("Shop ID:", shopId);
    console.log("Billing Details:", billings);
  }, [products, shop, subscription, shopId, billings]);

  const navigate = useNavigate();
  const [namespace, setNamespace] = useState("cartesian");
  const [isLoading, setIsLoading] = useState(false);

  //useEffect to handle the data passing and storing of the store domain ID
  useEffect(() => {
    console.log("The useEffect has been executed");
    const params = new URLSearchParams(window.location.search);
    const shopDomain = params.get("shop");
    console.log(shopDomain);
  }, []);
  const toggleNamespace = () => {
    setNamespace(namespace === "cartesian" ? "global" : "cartesian");
  };

  const handleNavigation = (path) => {
    setIsLoading(true); // Show loading modal
    navigate(path); // Navigate to the desired path
  };

  return (
    <div className="mainindex">
      <Page>
        <BlockStack gap="500">
          <Layout>
            <Layout.Section>
              <div className="videoContainer">
                <iframe
                  width="740"
                  height="325"
                  src="https://www.youtube.com/embed/luh7FD43Grw"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Layout.Section>

            <Layout.Section>
              <Card sectioned>
                <div className="topDivison">
                  <h1>Revolutionize Your Shopify Metadata Management</h1>
                  <ul>
                    <li>AI-powered tool for eCommerce metadata enhancement.</li>
                    <li>
                      Automatically generates detailed metadata from product
                      images.
                    </li>
                    <li>
                      Utilizes advanced computer vision and natural language
                      processing (NLP).
                    </li>
                    <li>
                      Creates product metadata, attributes, and specifications
                      effortlessly.
                    </li>
                    <li>
                      Helps businesses improve product discovery and customer
                      engagement.
                    </li>
                    <li>
                      Streamlines the listing process, reducing the need for
                      manual input.
                    </li>
                    <li>
                      Optimizes product pages for better online search
                      performance.
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={() => handleNavigation("/app/productdetails")}
                  variant="primary"
                  style={{
                    backgroundColor: "white",
                    color: "black",
                    borderColor: "black",
                  }}
                >
                  Get Started
                </Button>
              </Card>
              <br />

              <Card title="Features" sectioned>
                <BlockStack gap="300">
                  <div className="SecondDiv">
                    <h2>Generate Metadata</h2>
                    <p>
                      Select products from your store, and Majik will generate
                      metadata for you at just ₹1 per product. Our AI ensures
                      the most accurate and relevant metadata. Once you place
                      the order, the request is processed immediately.
                    </p>
                    <h2>Review Metadata</h2>
                    <p>
                      View and manage your metadata generation requests in
                      real-time. Apply the metadata to your products at any time
                      from the Review page. Process, review, and apply
                      effortlessly.
                    </p>
                    <h2>Manage Product Metadata</h2>
                    <p>
                      Get an overview of all your product metadata. Use the
                      MetaProducts page to create new metafields, update
                      existing ones, or delete unwanted ones. The 'cartesian'
                      namespace ensures that metadata created here is consistent
                      and easy to manage.
                    </p>
                  </div>
                </BlockStack>
              </Card>
              <br />

              <Card title="Display Metadata in Your Storefront" sectioned>
                <div className="ThirdDivision">
                  <h1> Display metafield on store front</h1>
                  <h3>
                    Use the following instructions to display the metafields
                    generated by Majik on your storefront:
                  </h3>
                  <div className="instructionArea">
                    <p>
                      <span className="steps">Step:1</span> -{`>`} Open your
                      online store
                    </p>
                    <div className="pageimages">
                      <img src={onlinestore} alt="online Store" />
                    </div>
                    <p>
                      <span className="steps">Step:2</span> -{`>`} Choose the
                      Online Store 2.0 theme you want to connect to your
                      metafield, and click on Customize button.
                    </p>
                    <img src={themeSelection} alt="themeSelection" />
                    <p>
                      <span className="steps">Step:3 - {`>`}</span>
                    </p>
                    <div className="addblockpart">
                      <div>
                        <p>
                          1. Navigate to your Shopify theme editor and click the{" "}
                          <span className="subtexts-add">Add Block</span> button
                          to insert a new block.
                        </p>
                        <p>
                          2. In the popup, select the{" "}
                          <span className="subtexts-app">App</span> option.
                        </p>
                        <p>
                          3. Choose the block provided by{" "}
                          <span className="subtexts-block">Majik</span> that you
                          want to add to your theme.
                        </p>
                        <p>
                          4. Customize and arrange the block within your theme
                          layout as needed.
                        </p>
                      </div>
                    </div>
                    <img
                      className="addBlockimg"
                      src={addBlock}
                      alt="Add block image"
                    ></img>
                    <p>
                      <span className="steps">Step:4 {`->`}</span> Select the
                      product. Copy the metafield's{" "}
                      <span className="subpro">Namesapce</span> and{" "}
                      <span className="subpro">Key</span> of a particular
                      product
                    </p>
                    <img src={mergedblock} alt="mergeBlock" />
                    <p>
                      <span>Step:5 {` -> `}</span>Place the required block on
                      the store front and add the metafiled and apply styling if
                      necessary
                    </p>
                    <img
                      className="metafieldonstore"
                      src={metafieldshow}
                      alt="metafields on the storefront"
                    />
                    <p>
                      The metafields have been successfully added to your
                      store's theme and will be visible on your storefront.
                    </p>
                  </div>
                  {/* <Button onClick={toggleNamespace} variant="primary">
                  Show {namespace === "cartesian" ? "Global" : "Cartesian"}{" "}
                  Namespace
                </Button> */}

                  {/* <Box
                  padding="400"
                  background="bg-surface-active"
                  borderWidth="025"
                  borderRadius="200"
                  borderColor="border"
                  overflowX="scroll"
                  marginBottom="10px"
                >
                  <pre style={{ margin: 0 }}>
                    <code>{metafieldCode}</code>
                  </pre>
                </Box> */}
                  {/* <p>
                  Simply paste this code into your Shopify theme to display
                  product metafields generated using Majik.
                </p> */}
                </div>
              </Card>
            </Layout.Section>
            <br />

            <Layout.Section secondary>
              <Card title="Why Choose Majik?" sectioned>
                <div className="whymajik">
                  <h2>AI-Powered Accuracy</h2>
                  <p>
                    Majik, powered by Plotch.ai, ensures the highest-quality
                    metadata using cutting-edge AI technology. Your store
                    deserves nothing less.
                  </p>
                </div>

                <div className="whymajik">
                  <h2>Real-Time Updates</h2>
                  <p>
                    Every change you make to your metadata is reflected in
                    real-time, giving you full control over your Shopify store.
                  </p>
                </div>
                <div className="whymajik">
                  <h2>Affordable</h2>
                  <p>
                    Generate accurate product metadata for just $1 per 10
                    products/month, saving you both time and money.
                  </p>
                </div>
              </Card>
              <br />
              <div className="bottompart">
                <Card title="Next Steps" sectioned marginBottom>
                  <List type="bullet">
                    <List.Item>
                      <p>
                        Visit the{" "}
                        <span
                          className="redirectbutton"
                          onClick={() =>
                            handleNavigation("/app/productdetails")
                          }
                        >
                          View
                        </span>{" "}
                        to start creating high-quality metadata.
                      </p>
                      {/* <Button className="redirectButton" plain onClick={() => handleNavigation("/app/productdetails")}>
                    View
                  </Button>{" "} */}
                    </List.Item>
                    <List.Item>
                      <p>
                        Track your metadata requests in real-time on the{" "}
                        <span
                          className="redirectbutton"
                          onClick={() => handleNavigation("/app/review")}
                        >
                          View.
                        </span>
                      </p>
                    </List.Item>
                    <List.Item>
                      <p>
                        Manage and edit existing metadata from the{" "}
                        <span
                          className="redirectbutton"
                          onClick={() => handleNavigation("/app/metafields")}
                        >
                          View
                        </span>
                      </p>
                    </List.Item>
                  </List>
                </Card>
              </div>
            </Layout.Section>
          </Layout>
        </BlockStack>

        {/* Loading Modal */}
        {isLoading && (
          <Modal
            open={isLoading}
            onClose={() => {}}
            title=""
            primaryAction={null}
          >
            <Modal.Section>
              <div style={{ textAlign: "center" }}>
                <Spinner size="large" />
                <p>Loading, please wait...</p>
              </div>
            </Modal.Section>
          </Modal>
        )}
      </Page>
    </div>
  );
}
