// import { json } from "@remix-run/node";
// import { authenticate } from "../shopify.server";
// import { Page, Spinner, Text } from "@shopify/polaris";
// import React, { useEffect, useState } from "react";
// import { useLoaderData } from "@remix-run/react";

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   let { shop } = session;
//   let myShop = shop.replace(".myshopify.com", "");
//   const pricingUrl = `https://admin.shopify.com/store/${myShop}/charges/majik/pricing_plans`;

//   return json({ pricingUrl });
// };

// export default function UpgradePage() {
//   const { pricingUrl } = useLoaderData();
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     if (pricingUrl) {
//       setIsLoading(false);
//     }
//   }, [pricingUrl]);

//   return (
//     <Page title="Upgrade Your Plan">
//       <div style={{ textAlign: 'center', marginTop: '20px' }}>
//         {isLoading ? (
//           <>
//             <Spinner size="large" />
//             <Text variant="bodyMd" color="subdued" style={{ marginTop: '20px' }}>
//               Please wait while we fetch the pricing details...
//             </Text>
//           </>
//         ) : (
//           <>
//             <Text variant="headingMd" style={{ marginTop: '20px' }}>
//               Shopify Pricing Plans
//             </Text>
//             <div style={{ marginTop: '20px', border: '1px solid #e1e1e1', padding: '20px', borderRadius: '8px' }}>
//               <iframe
//                 src={pricingUrl}
//                 style={{ width: '100%', height: '600px', border: 'none' }}
//                 title="Shopify Pricing Plans"
//               />
//             </div>
//           </>
//         )}
//       </div>
//     </Page>
//   );
// }
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Page, Card } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import React from "react";
import './css/pricingpage.css';

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const { shop } = session;
  const myShop = shop.replace(".myshopify.com", "");

  // Fetch the current billing details (active plan)
  const billingDetails = await billing.check();

  return json({
    shop: myShop,
    billingDetails: billingDetails || null,
  });
};

export default function PricingPage() {
  const { billingDetails, shop } = useLoaderData();
  
  console.log(billingDetails);
  const subscription = billingDetails?.appSubscriptions?.[0];

  return (
    <Page>
      <Card sectioned>
        <div className="pricehead">
          <p className="pricing-title">Current Pricing Plan</p>
        </div>
        {/* <p className="pricing-subtitle">
          You are currently on the following plan:
        </p> */}

        {subscription ? (
          <div className="maininfoPrice">
            <p className="pricing-plan-name">{subscription.name}</p>
            <p className="pricing-status">
              Status: <span className="activatespan">{subscription.status}</span>
            </p>
            <p className="pricing-test-plan">
              Test Plan: {subscription.test ? 'Yes' : 'No'}
            </p>
            <p className="pricing-active-payment">
              Active Payment: {subscription.hasActivePayment ? 'Yes' : 'No'}
            </p>
          </div>
        ) : (
          <p className="no-billing-info">
            No billing information available. Please check your plan in the Shopify Admin.
          </p>
        )}
      </Card>
    </Page>
  );
}
