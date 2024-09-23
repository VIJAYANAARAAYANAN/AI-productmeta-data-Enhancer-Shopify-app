import { json } from '@remix-run/node';
import { useLoaderData, useParams, useFetcher } from '@remix-run/react';
import { Page, Layout, Card, Text, Button, Toast, Frame, Banner } from '@shopify/polaris';
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

  const getProductDetails = (pid) => `
  query getProductById {
    product(id: "${pid}") {
      title
    }
  }
`;

  const productQuery = getProductDetails(productId);
  const productResponse = await admin.graphql(productQuery);
  const productDataResponse = await productResponse.json();

  console.log("Product data received:", productDataResponse);

  const parsedProductData = JSON.parse(productData);
  console.log("Parsed Product Data:", parsedProductData);

  const skipFields = ['request_id', 'customer_id', 'image_name', 'image_link', 'ondc_domain', 'product_id', 'ondc_item_id', 'seller_id', 'product_name', 'product_source', 'gen_product_id', 'scan_type'];

  const metafields = Object.entries(parsedProductData)
    .filter(([key, value]) => value && value.trim() !== "" && !skipFields.includes(key))
    .map(([key, value]) => ({
      namespace: productDataResponse.data.product.title,
      key,
      value,
      type: 'single_line_text_field',
    }));

  console.log("Prepared metafields for mutation:", metafields);

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

  const mutation = `
    mutation UpdateProductMetafield {
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
    const result = await admin.graphql(mutation);

    if (result.errors) {
      console.error("Mutation errors:", result.errors);
      return json({ success: false, message: 'Failed to apply metafields' });
    }

    console.log("Metafields applied successfully:", result);
    return json({ success: true, message: 'Metafields applied successfully!', res: JSON.stringify(result) });
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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (fetcher.data && fetcher.data.message) {
      setToastMessage(fetcher.data.message);
      setToastActive(true);
      if (!fetcher.data.success) {
        setErrorMessage(fetcher.data.message);
      }
    }
  }, [fetcher.data]);

  const handleApply = async (product) => {
    const productId = product.gen_product_id;
    console.log("Applying metafields for product ID:", productId);
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

  const errorBanner = errorMessage ? (
    <Banner status="critical">{errorMessage}</Banner>
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
                  {errorBanner}
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
  applyButton: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '93%',
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
