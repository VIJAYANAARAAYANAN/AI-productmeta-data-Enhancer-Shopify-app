import { useState } from "react";
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
import { Link } from "@remix-run/react";
import { useNavigate } from "react-router-dom";
import { TitleBar } from "@shopify/app-bridge-react";
import loadingGif from "./assets/loader.gif";
import "./css/index.css";
import onlinestore from "./assets/OnlineStore.png";
import themeSelection from "./assets/ThemeSelection.png";
import addBlock from "./assets/EditedAddblock.png";
import mergedblock from './assets/editedmergedimg.png';

export default function Index() {
  const navigate = useNavigate();
  const [namespace, setNamespace] = useState("cartesian");
  const [isLoading, setIsLoading] = useState(false);

  const toggleNamespace = () => {
    setNamespace(namespace === "cartesian" ? "global" : "cartesian");
  };

  const handleNavigation = (path) => {
    setIsLoading(true); // Show loading modal
    navigate(path); // Navigate to the desired path
  };

  const metafieldCode =
    namespace === "cartesian"
      ? `
    <div class="metafields-container">  
      {% assign product_namespace = "cartesian" %}
      {% for metafield in product.metafields[product_namespace] %}
        {% if metafield[1].value != blank %}
          <p><strong>{{ metafield[0] | replace: '_', ' ' | capitalize }}:</strong> {{ metafield[1].value }}</p>
        {% endif %}
      {% endfor %}
    </div>`
      : `
    <div class="metafields-container">
    {% assign possible_namespaces = "Your namespaces separated by ', ' " | split: ", " %}
    {% for namespace in possible_namespaces %}
      {% assign metafields = product.metafields[namespace] %}
      {% if metafields %}
        {% for metafield in metafields %}
          {% if metafield[1].value != blank %}
            <p>
              <strong>{{ metafield[0] | replace: '_', ' ' | capitalize }}:</strong> {{ metafield[1].value }}
            </p>
          {% endif %}
        {% endfor %}
      {% endif %}
    {% endfor %}
  </div>`;

  return (
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
                    metadata for you at just ₹1 per product. Our AI ensures the
                    most accurate and relevant metadata. Once you place the
                    order, the request is processed immediately.
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
                    MetaProducts page to create new metafields, update existing
                    ones, or delete unwanted ones. The 'cartesian' namespace
                    ensures that metadata created here is consistent and easy to
                    manage.
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
                      1. Navigate to your Shopify theme editor and click the <span className="subtexts-add">Add Block</span> button to insert a new block.
                    </p>
                    <p>2. In the popup, select the <span className="subtexts-app">App</span> option.</p>
                    <p>
                      3. Choose the block provided by <span className="subtexts-block">Majik</span> that you want to add to your theme.
                    </p>
                    <p>4. Customize and arrange the block within your theme layout as needed.</p>
                  </div>
                  </div>
                  <img
                    className="addBlockimg"
                    src={addBlock}
                    alt="Add block image"
                  ></img>
                  <p><span className="steps">Step:4 {`->`}</span> Select the product. Copy the metafield's <span className="subpro">Namesapce</span> and <span className="subpro">Key</span> of a particular product</p>
                  <img src={mergedblock} alt="mergeBlock" />
                  <p>The metafields have been successfully added to your store's theme and will be visible on your storefront.</p>
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
              <Box>
                <div>
                  <h2>AI-Powered Accuracy</h2>
                  <p>
                    Majik, powered by Plotch.ai, ensures the highest-quality
                    metadata using cutting-edge AI technology. Your store
                    deserves nothing less.
                  </p>
                </div>
              </Box>
              <Box>
                <h2>Real-Time Updates</h2>
                <p>
                  Every change you make to your metadata is reflected in
                  real-time, giving you full control over your Shopify store.
                </p>
              </Box>
              <Box>
                <h2>Affordable</h2>
                <p>
                  Generate accurate product metadata for just $1 per 10
                  products/month, saving you both time and money.
                </p>
              </Box>
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
                        onClick={() => handleNavigation("/app/productdetails")}
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
  );
}
