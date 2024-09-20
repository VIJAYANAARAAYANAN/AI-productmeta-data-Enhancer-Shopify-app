import { json } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { Page, Layout, Card, Text, Button, Toast } from '@shopify/polaris';
import { useState } from 'react';
import { authenticate } from "../shopify.server";

export const loader = async ({ params, request }) => {
  const requestId = params.requestId;

  const { admin } = await authenticate.admin(request);

  const shopQuery = `{
    shop {
      id
      name
      email
    }
  }`;

  try {
    const response = await admin.graphql(shopQuery);
    const shop = await response.json();
    console.log("Meta page is opened");
    if (!shop.data || !shop.data.shop) {
      throw new Error('Shop data is missing');
    }

    const shopId = shop.data.shop.id;
    console.log(shopId);
  
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
    console.log(response);
    if (!requestResponse.ok) {
      throw new Error(`Request failed with status ${requestResponse.status}`);
    }

    const requestData = await requestResponse.json();
    console.log(requestData);
    
    if (requestData && requestData.product_metada_data) {
      return json({
        requestData: requestData.product_metada_data,
      });
    }

    throw new Error("Invalid response structure or missing product metadata data");

  } catch (error) {
    return json({
      requestData: null,
      error: error.message,
    });
  }
};

export default function MetaView() {
  const { requestId } = useParams();
  const { requestData, error, admin } = useLoaderData();
  const [toastActive, setToastActive] = useState(false);

  const handleApply = async (product) => {
    console.log("Apply is clicked ")
    const productId = product.image_link;
    console.log(productId);
 
  //   const metafields = Object.entries(product)
  //     .filter(([key, value]) => value && value.trim() !== "" && !['customer_id', 'gen_product_id', 'request_id', 'scan_type'].includes(key))
  //     .map(([key, value]) => ({
  //       namespace: 'custom_data',
  //       key,
  //       value,
  //       type: 'single_line_text_field',
  //     }));

  //   const metafieldsString = metafields.map(metafield => `
  //     {
  //       namespace: "${metafield.namespace}"
  //       key: "${metafield.key}"
  //       value: "${metafield.value}"
  //       type: "${metafield.type}"
  //     }
  //   `).join(',');

  //   const mutation = `
  //     mutation {
  //       productUpdate(
  //         input: {
  //           id: "${productId}",
  //           metafields: [${metafieldsString}]
  //         }
  //       ) {
  //         product {
  //           id
  //         }
  //         userErrors {
  //           field
  //           message
  //         }
  //       }
  //     }
  //   `;

  //   try {
  //     const result = await admin.graphql(mutation);

  //     if (result.errors) {
  //       console.error('Error creating metafields:', result.errors);
  //       setToastActive('Failed to apply metafields!');
  //     } else {
  //       setToastActive('Applied!');
  //     }
  //   } catch (error) {
  //     console.error('Failed to apply metafields:', error);
  //     setToastActive('Failed to apply metafields!');
  //   }
  };

  const toastMarkup = toastActive ? (
    <Toast content={toastActive} onDismiss={() => setToastActive(false)} />
  ) : null;

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
                       <div style={styles.applybutton}>
                        <Button onClick={() => handleApply(product)}>Apply</Button>
                        </div>
                       
                      <div style={styles.imageContainer}>
                        <img src={product.image_link} alt={product.product_name} style={styles.image} />
                      </div>
                      <Text size="large" element="h2">{product.product_name}</Text>
                      <div style={styles.detailsContainer}>
                        {Object.entries(product).map(([key, value]) => {
                          if (value && value.trim() !== "" && !['product_name', 'gen_product_id', 'image_link'].includes(key)) {
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
      {toastMarkup}
    </Page>
  );
}

const styles = {
  flexContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  imageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applybutton:{
    display: 'flex',
    justifyContent: 'flex-end',
    width:'93%',

  },
  image: {
    width: '300px',
    height: 'auto',
    borderRadius: '8px',
  },
  detailsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginTop: '20px',
    borderBottom: '1px solid',
    paddingBottom: '30px',
    marginBottom: '20px',
  },
  detailItem: {
    marginBottom: '8px',
  },
};
