import { json } from '@remix-run/node';
import { useLoaderData, useParams, useFetcher } from '@remix-run/react';
import { Page, Layout, Card, Text, Button, Toast, Frame } from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { authenticate } from '../shopify.server';

export const loader = async ({ params, request }) => {
  console.log("Loader function triggered");
  const requestId = params.requestId;

  const { admin } = await authenticate.admin(request);
  console.log("Authenticated admin object:", admin);

  const shopQuery = `{
    shop {
      id
      name
      email
    }
  }`;

  try {
    console.log("Fetching shop details using GraphQL query");
    const response = await admin.graphql(shopQuery);
    const shop = await response.json();

    console.log("Shop data received:", shop);

    if (!shop.data || !shop.data.shop) {
      throw new Error('Shop data is missing');
    }

    const shopId = shop.data.shop.id;
    console.log("Shop ID:", shopId);

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

    console.log("Request to external API sent");

    if (!requestResponse.ok) {
      throw new Error(`Request failed with status ${requestResponse.status}`);
    }

    const requestData = await requestResponse.json();
    console.log("External API response received:", requestData);

    if (requestData && requestData.product_metada_data) {
      console.log("Product metadata found:", requestData.product_metada_data);
      return json({
        requestData: requestData.product_metada_data,
      });
    }

    throw new Error("Invalid response structure or missing product metadata data");

  } catch (error) {
    console.error("Error in loader:", error.message);
    return json({
      requestData: null,
      error: error.message,
    });
  }
};

export const action = async ({ request }) => {
  console.log("Action function triggered");
  const formData = await request.formData();
  const productId = formData.get("productId");
  const productData = formData.get("productData");

  console.log("Received productId:", productId);
  console.log("Received productData:", productData);

  const parsedProductData = JSON.parse(productData);
  console.log("Parsed product data:", parsedProductData);

  const metafields = Object.entries(parsedProductData)
    .filter(([key, value]) => value && value.trim() !== "" && !['request_id', 'customer_id', 'image_name', 'image_link', 'ondc_domain', 'product_id', 'ondc_item_id', 'seller_id', 'product_name', 'product_source', 'gen_product_id', 'scan_type'].includes(key))
    .map(([key, value]) => ({
      namespace: 'custom_data',
      key,
      value,
      type: 'single_line_text_field',
    }));

  console.log("Prepared metafields for mutation:", metafields);

  const defineMetafields = async () => {
    try {
      const { admin } = await authenticate.admin(request);
  
      for (const metafield of metafields) {
        const queryCheckDefinition = `
          {
            metafieldDefinitions(first: 1, query: "${metafield.key}", ownerType: PRODUCT) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        `;
  
        const resultCheck = await admin.graphql(queryCheckDefinition);
        console.log(`Metafield definition check for ${metafield.key}:`, resultCheck);
  
        if (resultCheck.data && resultCheck.data.metafieldDefinitions.edges.length === 0) {
          console.log(`Creating metafield definition for ${metafield.key}`);
  
          const mutationCreateDefinition = `
            mutation CreateMetafieldDefinition {
              metafieldDefinitionCreate(
                definition: {
                  name: "${metafield.key}",  
                  namespace: "${metafield.namespace || 'custom_data'}",
                  key: "${metafield.key}",  
                  description: "${metafield.description || ''}",  
                  type: "${metafield.type || 'single_line_text_field'}",  
                  ownerType: PRODUCT,
                  "access": {
                    "admin": "MERCHANT_READ_WRITE",
                    "storefront": "PUBLIC_READ"
                  }
                }
              ) {
                createdDefinition {
                  id
                  name
                }
                userErrors {
                  field
                  message
                  code
                }
              }
            }
          `;
  
          const resultCreate = await admin.graphql(mutationCreateDefinition);
          console.log(`Metafield definition creation result for ${metafield.key}:`, resultCreate);
  
          if (resultCreate.data.metafieldDefinitionCreate.userErrors.length) {
            resultCreate.data.metafieldDefinitionCreate.userErrors.forEach((error) => {
              console.error(`Error creating definition for ${metafield.key}:`, error.message);
            });
          } else {
            console.log(`Definition created for ${metafield.key} with ID:`, resultCreate.data.metafieldDefinitionCreate.createdDefinition.id);
          }
        }
      }
    } catch (error) {
      console.error("Error while defining metafields:", error.message);
    }
  };
  
  await defineMetafields();

  const skipFields = ['request_id', 'customer_id', 'image_name', 'image_link', 'ondc_domain', 'product_id', 'ondc_item_id', 'seller_id', 'product_name', 'product_source', 'gen_product_id', 'scan_type'];

  const metafieldsString = metafields
    .filter(({ key }) => !skipFields.includes(key))
    .map(({ namespace, key, value, type }) => `
      {
        namespace: "${namespace}",
        key: "${key}",
        value: "${value}",
        type: "${type}"
      }
    `).join(', ');
  
  console.log(metafieldsString);
  
  const mutation = `
    mutation UpdateProductMetafield{
      productUpdate(
        input: {
          id: "${productId}",
          metafields: [${metafieldsString}]
        }
      ) {
        product {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const { admin } = await authenticate.admin(request);
    console.log("Admin authentication successful, sending mutation");

    const result = await admin.graphql(mutation);

    console.log("Mutation result:", result);

    if (result.errors) {
      console.error("Mutation errors:", result.errors);
      return json({ success: false, message: 'Failed to apply metafields' });
    }

    console.log("Metafields applied successfully");
    return json({ success: true, message: 'Metafields applied successfully!', res:JSON.stringify(result.data)});
  } catch (error) {
    console.error("Error during mutation:", error.message);
    return json({ success: false, message: 'Error during mutation: ' + error.message });
  }
};

export default function MetaView() {
  const { requestId } = useParams();
  const { requestData, error } = useLoaderData();
  const fetcher = useFetcher();
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  console.log("MetaView component loaded with requestId:", requestId);

  useEffect(() => {
    if (fetcher.data && fetcher.data.message) {
      console.log("Fetcher response received:", fetcher.data);
      setToastMessage(fetcher.data.message);
      setToastActive(true);
    }
  }, [fetcher.data]);

  const handleApply = async (product) => {
    console.log(product);
    const productId = product.gen_product_id;
    console.log("Applying metafields for product:", productId);

    fetcher.submit(
      {
        productId,
        productData: JSON.stringify(product),
      },
      { method: 'post' }
    );

    console.log("Submit request sent for product:", productId);
  };

  const toastMarkup = toastActive ? (
    <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
  ) : null;

  return (
    <Frame>
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
                        <div style={styles.applyButton}>
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
                    <Text size="small" color="subdued">
                      No product metadata available.
                    </Text>
                  )}
                </div>
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
      {toastMarkup}
    </Frame>
  );
}

const styles = {
  flexContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  applyButton: {
    marginRight: '1rem',
  },
  imageContainer: {
    width: '120px',
    height: '120px',
    overflow: 'hidden',
    marginRight: '1rem',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  detailsContainer: {
    flexGrow: 1,
  },
  detailItem: {
    marginBottom: '0.5rem',
  },
};
