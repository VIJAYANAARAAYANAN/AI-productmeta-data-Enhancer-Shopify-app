import * as React from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Badge,
  Frame,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Loader function with detailed logging
export const loader = async ({ request }) => {
  console.log("Loader function started");

  const { admin } = await authenticate.admin(request);

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
    console.log("Fetching shop data...");
    const response = await admin.graphql(shopQuery);
    const shop = await response.json();
    console.log("Shop data:", shop);

    if (!shop.data || !shop.data.shop) {
      throw new Error("Shop data is missing");
    }

    const shopId = shop.data.shop.id;
    console.log("Shop ID:", shopId);
    console.log(
      "Making POST request to the API with the shop_id as customer id...",
      shopId,
    );
    const requestResponse = await fetch(
      "https://cartesian-api.plotch.io/catalog/genrequestlist/fetch",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: shopId,
        }),
      },
    );

    console.log("Checking request response status...");
    if (!requestResponse.ok) {
      const errorText = await requestResponse.text();
      console.log(
        `Request failed with status ${requestResponse.status}: ${errorText}`,
      );
      throw new Error(`Request failed with status ${requestResponse.status}`);
    }

    console.log("Parsing request response...");
    const requestData = await requestResponse.json();
    console.log("Request data received:", requestData);

    if (requestData.api_action_status === "success") {
      console.log("Request data fetching succeeded.");
      return json({
        requestData: requestData.request_data || [],
      });
    }

    throw new Error("API action status is not 'success'");
  } catch (error) {
    console.error("Error fetching shop details or request data:", error);
    return json({
      requestData: [
        {
          request_id: "NA",
          request_status: "NA",
          request_date: "NA",
          num_products: "NA",
          download_link: "NA",
        },
      ],
    });
  }
};

// React component with dynamic data handling and logging
export default function RequestTable() {
  const data = useLoaderData();
  const [isLoading, setIsLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);

  // Fetch requestData dynamically
  React.useEffect(() => {
    console.log("useEffect triggered");
    if (data && data.requestData) {
      console.log("Setting table rows with fetched data:", data.requestData);

      // Dynamically update rows with fetched data
      const formattedRows = data.requestData.map((request) => [
        request.request_id,
        <Badge
          status={
            request.request_status === "COMPLETED" ? "success" : "attention"
          }
        >
          {request.request_status}
        </Badge>,
        request.request_date,
        request.num_products,
        <Button plain onClick={() => handleDownload(request.download_link)}>
          Download
        </Button>,
        <Button plain>
          <Link to={`/app/metaview/${request.request_id}`}>View</Link>
        </Button>,
      ]);

      setRows(formattedRows);
      setIsLoading(false); // Set loading to false once data is set
    } else {
      console.log("No requestData available, keeping loading state active.");
    }
  }, [data]);

  // Download handler
  const handleDownload = (url) => {
    console.log("Download initiated for URL:", url);
    window.location.href = url;
  };

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <Card>
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                ]}
                headings={[
                  "Request Id",
                  "Request Status",
                  "Request Date",
                  "Num Products",
                  "Sheet",
                  "Review",
                ]}
                rows={rows}
                loading={isLoading}
                pagination={{
                  hasNext: true,
                  onNext: () => {},
                }}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
