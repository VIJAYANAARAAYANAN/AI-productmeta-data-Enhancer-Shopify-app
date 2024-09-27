import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get productId
import { Button, Card, Select, Toast, Banner, Frame } from "@shopify/polaris";
import { json } from "@remix-run/node"; // Import json
import { authenticate } from "../shopify.server";
import { useLoaderData, useFetcher } from "@remix-run/react";

// Loader function to fetch product details
export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;

  const productQuery = `
    query getProductById {
      product(id: "${productId}") {
        id
        title
        images(first: 1) {
          edges {
            node {
              originalSrc
              altText
            }
          }
        }
      }
    }
  `;

  try {
    const productResponse = await admin.graphql(productQuery);
    const productData = await productResponse.json();

    const imageUrl =
      productData.data.product.images.edges.length > 0
        ? productData.data.product.images.edges[0].node.originalSrc
        : null;

    return json({
      product: {
        id: productData.data.product.id,
        title: productData.data.product.title,
        imageUrl: imageUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching product data:", error);
    return json({ product: null }, { status: 500 });
  }
};

// Action function to handle metafield creation
export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = `gid://shopify/Product/${params.productId}`;
  const metafields = JSON.parse(formData.get("metafields"));

  // Prepare the mutation string without skipping any fields
  const metafieldsString = metafields
    .map(
      ({ namespace, key, value, type }) => `
      {
        namespace: "${namespace}",
        key: "${key}",
        value: "${value}",
        type: "${type}"
      }
    `
    )
    .join(", ");

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
    const result = await admin.graphql(mutation);
    const resultData = await result.json();

    if (resultData.errors) {
      console.error("Mutation errors:", resultData.errors);
      return json({ success: false, message: "Failed to apply metafields" });
    }

    return json({
      success: true,
      message: "Metafields applied successfully!",
    });
  } catch (error) {
    console.error("Error during mutation:", error.message);
    return json({
      success: false,
      message: "Error during mutation: " + error.message,
    });
  }
};

export default function DynamicRowsWithProductId() {
  const { productId } = useParams();
  const { product } = useLoaderData();
  const fetcher = useFetcher();

  const [rows, setRows] = useState([
    { type: "single_line_text_field", namespace: "Cartesian", key: "", value: "" },
  ]);

  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (fetcher.data && fetcher.data.message) {
      setToastMessage(fetcher.data.message);
      setToastActive(true);
      if (!fetcher.data.success) {
        setErrorMessage(fetcher.data.message);
      }
    }
  }, [fetcher.data]);

  const handleInputChange = (index, key, value) => {
    const newRows = [...rows];
    newRows[index][key] = value;
    setRows(newRows);
  };

  const handleAddRow = () => {
    setRows([...rows, { type: "single_line_text_field", namespace: "Cartesian", key: "", value: "" }]);
  };

  const handleSave = () => {
    const metafields = rows.map(row => ({
      namespace: row.namespace,
      key: row.key,
      value: row.value,
      type: row.type,
    }));

    fetcher.submit(
      { metafields: JSON.stringify(metafields) },
      { method: "post", action: `/app/ProductMetafieldAdd/${productId}` }
    );
  };

  const typeOptions = [
    { label: "Single Line Text", value: "single_line_text_field" },
    { label: "Color", value: "color" },
    { label: "Date", value: "date" },
    { label: "Boolean", value: "boolean" },
    { label: "Integer", value: "number_integer" },
    { label: "Decimal", value: "number_decimal" },
    { label: "Multi Line Text", value: "multi_line_text_field" },
    { label: "Money", value: "money" },
    { label: "Link", value: "link" },
    { label: "JSON", value: "json" },
    { label: "Dimension", value: "dimension" },
    { label: "URL", value: "url" },
  ];

  const toastMarkup = toastActive ? (
    <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
  ) : null;

  const errorBanner = errorMessage ? (
    <Banner status="critical">{errorMessage}</Banner>
  ) : null;

  return (
    <Frame>
      <Card title={`Add New Metafields for Product ID: ${productId}`}>
        {product ? (
          <>
            {product.imageUrl && (
              <img
                className="addproductimage"
                src={product.imageUrl}
                alt={product.title}
              />
            )}
            <h4>{product.title}</h4>
            {errorBanner}
            <div
              style={{
                marginTop: '20px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#f9f9f9',
                  padding: '10px',
                  borderBottom: '1px solid #ddd',
                  fontWeight: 'bold',
                }}
              >
                <div style={{ flex: 1, textAlign: 'center' }}>Type</div>
                <div style={{ flex: 1, textAlign: 'center' }}>Namespace</div>
                <div style={{ flex: 1, textAlign: 'center' }}>Key</div>
                <div style={{ flex: 1, textAlign: 'center' }}>Value</div>
              </div>

              {rows.map((row, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid #ddd',
                    padding: '10px 0',
                  }}
                >
                  <div style={{ flex: 1, padding: '0 10px' }}>
                    <Select
                      options={typeOptions}
                      onChange={(value) => handleInputChange(index, 'type', value)}
                      value={row.type}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ flex: 1, padding: '0 10px' }}>
                    <input
                      type="text"
                      value="Cartesian"
                      readOnly
                      style={{
                        width: '100%',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #ccc',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, padding: '0 10px' }}>
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => handleInputChange(index, 'key', e.target.value)}
                      style={{ width: '100%', borderRadius: '4px', border: '1px solid #ccc', padding: '8px' }}
                    />
                  </div>
                  <div style={{ flex: 1, padding: '0 10px' }}>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) =>
                        handleInputChange(index, 'value', e.target.value)
                      }
                      style={{ width: '100%', borderRadius: '4px', border: '1px solid #ccc', padding: '8px' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleAddRow}>Add New Metafield</Button>
            <Button onClick={handleSave}>Save Metafields</Button>
          </>
        ) : (
          <Banner status="critical">Product not found</Banner>
        )}
        {toastMarkup}
      </Card>
    </Frame>
  );
}
