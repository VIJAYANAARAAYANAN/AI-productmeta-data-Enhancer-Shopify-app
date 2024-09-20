import { json } from '@remix-run/node';
import { useLoaderData, useParams, useFetcher } from '@remix-run/react';
import { Page, Layout, Card, Text, Button, Toast, Frame } from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { authenticate } from '../shopify.server';

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

    if (!shop.data || !shop.data.shop) {
      throw new Error('Shop data is missing');
    }

    const shopId = shop.data.shop.id;

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
      throw new Error(`Request failed with status ${requestResponse.status}`);
    }

    const requestData = await requestResponse.json();
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

export const action = async ({ request }) => {
  const formData = await request.formData();
  const productId = formData.get("productId");
  const productData = formData.get("productData");

  const parsedProductData = JSON.parse(productData);
  const metafields = Object.entries(parsedProductData)
    .filter(([key, value]) => value && value.trim() !== "" && !['request_id', 'customer_id', 'image_name', 'image_link', 'ondc_domain', 'product_id', 'ondc_item_id', 'seller_id', 'product_name', 'product_source', 'gen_product_id', 'scan_type'].includes(key))
    .map(([key, value]) => ({
      namespace: 'custom_data',
      key,
      value,
      type: 'single_line_text_field',
    }));

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
  
        if (resultCheck.data && resultCheck.data.metafieldDefinitions.edges.length === 0) {
          const mutationCreateDefinition = `
            mutation CreateMetafieldDefinition {
              metafieldDefinitionCreate(
                definition: {
                  name: "${metafield.key}",  
                  namespace: "${metafield.namespace || 'custom_data'}",
                  key: "${metafield.key}",  
                  description: "${metafield.description || ''}",  
                  type: "${metafield.type || 'single_line_text_field'}",  
                  ownerType: PRODUCT
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
  
          if (resultCreate.data.metafieldDefinitionCreate.userErrors.length) {
            resultCreate.data.metafieldDefinitionCreate.userErrors.forEach((error) => {
              console.error(`Error creating definition for ${metafield.key}:`, error.message);
            });
          }
        }
      }
    } catch (error) {
      console.error("Error while defining metafields:", error.message);
    }
  };

  await defineMetafields();

  const skipFields = ['request_id', 'customer_id', 'image_name', 'image_link', 'ondc_domain', 'product_id', 'ondc_item_id', 'seller_id', 'product_name', 'product_source', 'gen_product_id', 'scan_type'];

  const metafieldsToSet = metafields
    .filter(({ key }) => !skipFields.includes(key))
    .map(({ namespace, key, value, type }) => ({
      namespace,
      key,
      value,
      type,
      ownerId: `${productId}`,
    }));

  try {
    const { admin } = await authenticate.admin(request);
    const response = await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          metafields: metafieldsToSet,
        },
      },
    );

    const data = await response.json();

    if (data.errors) {
      console.error("Mutation errors:", data.errors);
      return json({ success: false, message: 'Failed to apply metafields' });
    }

    return json({ success: true, message: 'Metafields applied successfully!', res: JSON.stringify(data.data) });
  } catch (error) {
    return json({ success: false, message: 'Error during mutation: ' + error.message });
  }
};

export default function MetaView() {
  const { requestId } = useParams();
  const { requestData, error } = useLoaderData();
  const fetcher = useFetcher();
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (fetcher.data && fetcher.data.message) {
      setToastMessage(fetcher.data.message);
      setToastActive(true);
    }
  }, [fetcher.data]);

  const handleApply = async (product) => {
    const productId = product.gen_product_id;

    fetcher.submit(
      {
        productId,
        productData: JSON.stringify(product),
      },
      { method: 'post' }
    );
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
