// app/routes/app.metaview.$requestId.jsx
import { json } from '@remix-run/node'; // for server-side JSON responses
import { useLoaderData, useParams } from '@remix-run/react';
import { Page, Layout, Card,Text } from '@shopify/polaris';
import { authenticate } from "../shopify.server";

// Loader function to handle data fetching
export const loader = async ({ params, request }) => {
  const requestId = params.requestId;

  // Step 1: Fetch shop and customer details (customer_id)
  const { admin } = await authenticate.admin(request);

  const shopQuery = `{
    shop {
      id
      name
      email
    }
  }`;

  try {
    console.log("Fetching shop data...");
    const response = await admin.graphql(shopQuery);
    const shop = await response.json();
    console.log("Shop data:", shop);

    if (!shop.data || !shop.data.shop) {
      throw new Error('Shop data is missing');
    }

    const shopId = shop.data.shop.id; // Customer ID equivalent

    // Step 2: Make POST request to external API
    console.log("Making POST request to the API with the shop_id as customer id:", shopId);
    console.log("Making POST request with request_id:", requestId);
    
    const requestResponse = await fetch('https://cartesian-api.plotch.io/catalog/ai/metadata/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request_id: requestId,
        customer_id: shopId,
      }),
    });

    if (!requestResponse.ok) {
      const errorText = await requestResponse.text();
      console.log(`Request failed with status ${requestResponse.status}: ${errorText}`);
      throw new Error(`Request failed with status ${requestResponse.status}`);
    }

    console.log("Parsing request response...");
    const requestData = await requestResponse.json();
    console.log("Request data received:", requestData);

    if (requestData && requestData.product_metada_data) {
      return json({
        requestData: requestData.product_metada_data, // Returning the fetched metadata
      });
    }

    throw new Error("Invalid response structure or missing product metadata data");

  } catch (error) {
    console.error("Error fetching shop details or request data:", error);
    return json({
      requestData: null,
      error: error.message,
    });
  }
};

export default function MetaView() {
  const { requestId } = useParams(); // Extract requestId from the URL
  const { requestData, error } = useLoaderData(); // Load the fetched data

  // Helper function to filter out non-null values
  const filterNonNullValues = (data) => {
    return Object.entries(data).filter(([key, value]) => value && value.trim() !== "").map(([key, value]) => ({ key, value }));
  };

  return (
    <Page title={`Request ID: ${requestId}`}>
      <Layout>
        <Layout.Section>
          <Card title="Request Details">
            {error ? (
              <Text size="small" color="critical">
                Error fetching request details: {error}
              </Text>
            ) : (
              <div>
                <p>Details for Request ID: {requestId}</p>
                {requestData ? (
                  requestData.map((product) => (
                    <div key={product.gen_product_id} style={styles.flexContainer}>
                      <div style={styles.imageContainer}>
                        <img src={product.image_link} alt={product.product_name} style={styles.image} />
                      </div>
                      <Text size="large" element="h2">{product.product_name}</Text>
                      <div style={styles.detailsContainer}>
                   
                          {Object.entries(product).map(([key, value]) => {
                            if (value && value.trim() !== "" && key !== 'product_name' && key !== 'gen_product_id' && key !== 'image_link') {
                              return (
                                <div key={key} style={styles.detailItem}>
                                  <strong>{key.replace(/_/g, ' ')}:</strong> {value}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                    </div>
                  ))
                ) : (
                  <Text size="small">No metadata found for this request.</Text>
                )}
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

const styles = {
  flexContainer:{
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '20px',
  },

  gridContainer: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gridTemplateColumns: '1fr 2fr',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '20px',
  },

  imageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {
    maxWidth: '30%',
    height: 'auto',
    borderRadius: '8px',
  },

  detailsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', 
    gap: '16px', // Space between items
    marginTop: '20px',
    borderBottom: '1px solid', // Correct property and value
    paddingBottom: '30px',
    marginBottom: '20px',
  },

  detailItem: {
    marginBottom: '8px',
  },
  
};
