import * as React from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import "@shopify/polaris/build/esm/styles.css";
import "./css/requesttable.css";
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

const handleViewClick = () => {
  console.log("View button clicked");
};

// React component with dynamic data handling and logging
export default function RequestTable() {
  const data = useLoaderData();
  const [isLoading, setIsLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const rowsPerPage = 20;

  // Fetch requestData dynamically
  React.useEffect(() => {
    if (data && data.requestData) {
      // Dynamically update rows with fetched data
      const formattedRows = data.requestData.map((request) => ({
        requestId: request.request_id,
        requestStatus: request.request_status,
        requestDate: request.request_date,
        numProducts: request.num_products,
        downloadLink: request.download_link,
      }));
      setRows(formattedRows);
      setIsLoading(false);
    }
  }, [data]);

  // Download handler
  const handleDownload = (url) => {
    window.location.href = url;
  };

  // Pagination handlers
  const paginatedRows = rows.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage,
  );

  const handleDateformat = (reqDate) => {
    console.log("Customized date format");
    return reqDate.split(" ")[0];
  };

  const hasNext = (currentPage + 1) * rowsPerPage < rows.length;
  const hasPrevious = currentPage > 0;

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <div className="wholearea">
              <div className="grid-container">
                <p>Review Metadata</p>
              </div>
              <div className="allrows">
                <div className="grid-header">
                  <div>Request Id</div>
                  <div>Request Status</div>
                  <div>Request Date</div>
                  <div>Num Products</div>
                  <div>Sheet</div>
                  <div>Review</div>
                </div>
                {isLoading ? (
                  <div>Loading...</div>
                ) : (
                  paginatedRows.map((request, index) => (
                    <div className="grid-row" key={index}>
                      <div>
                        <p>{request.requestId}</p>
                      </div>
                      <div
                        className={`${
                          request.requestStatus === "COMPLETED"
                            ? "completedStatus"
                            : "pendingStatus"
                        }`}
                      >
                        <p className="statusres">{request.requestStatus}</p>
                      </div>

                      <div>
                        <p>{handleDateformat(request.requestDate)}</p>
                      </div>
                      <div>
                        <p>{request.numProducts}</p>
                      </div>
                      <div>
                        <button
                          className={`downloadpink ${request.requestStatus !== "COMPLETED" ? "disabled" : ""}`}
                          onClick={() => handleDownload(request.downloadLink)}
                          disabled={request.requestStatus !== "COMPLETED"}
                        >
                          Download
                        </button>
                      </div>
                      <div className="viewbutton">
                        <button
                          className={`Viewpink ${request.requestStatus !== "COMPLETED" ? "disabled" : ""}`}
                          onClick={handleViewClick}
                          disabled={request.requestStatus !== "COMPLETED"}
                        >
                          {request.requestStatus === "COMPLETED" ? (
                            <Link
                              to={`/app/metaview/${request.requestId}`}
                              style={{
                                color: "inherit",
                                textDecoration: "none",
                              }}
                            >
                              View
                            </Link>
                          ) : (
                            <span>View</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="pagination-buttons">
              <Button
                disabled={!hasPrevious}
                variant="primary"
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>

              <span className="page-number">
                {currentPage + 1} / {Math.ceil(rows.length / rowsPerPage)}
              </span>

              <Button
                disabled={!hasNext}
                variant="primary"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
