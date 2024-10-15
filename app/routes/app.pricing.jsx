import * as React from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { Page, Layout, Frame, Card, Button } from "@shopify/polaris";
import "./css/pricingpage.css";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const { shop } = session;
  const myShop = shop.replace(".myshopify.com", "");

  // Fetch billing details (active plan)
  const billingDetails = await billing.check();
  const subscription = billingDetails?.appSubscriptions?.[0];

  return json({
    billingDetails: billingDetails || null,
    subscription: subscription,
    shopId: myShop, // Shop ID for the subscription URL
  });
};

export default function Pricing() {
  const data = useLoaderData();
  const billingDetails = data.billingDetails;
  const subscription = data.subscription;
  const shopId = data.shopId; // Shop ID from the loader

  const subscriptionUrl = shopId
    ? `https://admin.shopify.com/store/${shopId}/charges/majik/pricing_plans`
    : "";

  const isMajikProPlan = subscription?.name === "Majik-Pro";

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <div className="pricing-container">
              <h1 className="pricing-title">Choose Your Plan</h1>
              <div className="pricing-cards">
                <Card title="Free Plan" sectioned>
                  <p>Majik-Basic</p>
                  <h3>Free</h3>
                  <div className="pricingdetail">
                  <p>Generate up to 5 product metafields per month.</p>
                  <p>Modify unlimited metafiled</p>
                  <p>Create unlimited metadata</p>
                  <p>High quality Metadata</p>
                  </div>
                  {isMajikProPlan ? (
                    <Button disabled>Current Plan</Button>
                  ) : (
                    <a
                      href={subscriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="primary">Subscribe to Free Plan</Button>
                    </a>
                  )}
                </Card>

                <Card title="Majik-Pro Plan - $10/month" sectioned>
                  <p>Majik-Pro</p>
                  <h3>$10 / month</h3>
                  <div className="pricingdetail">
                  <p>Generate up to 100 product metafields per month.</p>
                  <p>Modify unlimited metafiled</p>
                  <p>Create unlimited metadata</p>
                  <p>High quality Metadata</p>
                
                  </div>
                  {isMajikProPlan ? (
                    <Button disabled>Current Plan</Button>
                  ) : (
                    <a
                      href={subscriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="primary">Subscribe to Majik-Pro</Button>
                    </a>
                  )}
                </Card>
              </div>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
