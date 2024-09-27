import React, { useState } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get productId
import { Button, Card, Select } from "@shopify/polaris";
import "../routes/css/metafieldadd.css";
import { authenticate } from "../shopify.server";
import { useLoaderData, redirect } from "@remix-run/react";
import { json } from "@remix-run/node"; // Import useLoaderData

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;
  console.log("Product ID:", productId); // Log the product ID

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

    // Log the response to check if product data is fetched properly
    console.log("Fetched product data:", productData);

    // Check if the product has images
    const imageUrl =
      productData.data.product.images.edges.length > 0
        ? productData.data.product.images.edges[0].node.originalSrc
        : null;

    console.log("Fetched image URL:", imageUrl);

    // Check if there are any errors in the response
    if (productResponse.ok && productData.data.product) {
      return json({
        product: {
          id: productData.data.product.id,
          title: productData.data.product.title,
          imageUrl: imageUrl,
        },
      });
    } else {
      throw new Error("Product not found or API error");
    }
  } catch (error) {
    console.error("Error fetching product data:", error); // Log the error
    return json(
      {
        product: null,
      },
      { status: 500 },
    ); // Return a 500 status if there's an error
  }
};

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
    
    console.log("This is the result data",resultData.data.productUpdate.product);
    return json({
      success: true,
      message: "Metafields applied successfully!",
      result: resultData
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
  const { product } = useLoaderData(); // Get product data from loader

  const [rows, setRows] = useState([
    { type: "single_line_text_field", namespace: "cartesian", key: "", value: "" },
  ]);

  // Handle input change for each row
  const handleInputChange = (index, key, value) => {
    const newRows = [...rows];
    newRows[index][key] = value;
    setRows(newRows);
  };

  // Handle adding a new row
  const handleAddRow = () => {
    setRows([...rows, { type: "single_line_text_field", namespace: "cartesian", key: "", value: "" }]);
  };

  // Handle save button click
  const handleSave = () => {
    const metafields = rows.map(row => ({
      namespace: row.namespace,
      key: row.key,
      value: row.value,
      type: row.type,
    }));

    console.log("Metafields to be sent:", metafields); // Log metafields to be sent
    // Send metafields to the action function (using form submission)
    const formData = new FormData();
    formData.append("metafields", JSON.stringify(metafields));
    
    // Create a POST request to trigger the action function
    fetch(`/app/ProductMetafieldAdd/${productId}`, {
      method: "POST",
      body: formData,
    }).then(response => {
      if (response.ok) {
        console.log("Metafields successfully updated!"); // Log success message
      } else {
        console.error("Error updating metafields"); // Log error message
      }
    });
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

  return (
    <div className="metafieldadd-container">
      <Card>
        <div className="addproduct-detail">
          {product ? (
            <>
              {product.imageUrl && (
                <img
                  className="addproductimage"
                  src={product.imageUrl}
                  alt={product.title}
                />
              )}
              <div className="subadddata">
                <h4>{product.title}</h4>
                <h4 className="addproduct-title">
                  Add New Metafields for Product ID: {productId}
                </h4>
              </div>
            </>
          ) : (
            <p>Product not found</p>
          )}
        </div>
      </Card>

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
                style={{ width: '100%', borderRadius: '4px', padding: '8px' }}
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
                  borderRadius: '4px',
                  padding: '8px',
                }}
              />
            </div>
            <div style={{ flex: 1, padding: '0 10px' }}>
              <input
                type="text"
                value={row.key}
                onChange={(e) => handleInputChange(index, 'key', e.target.value)}
                placeholder="Key"
                style={{
                  width: '100%',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                }}
              />
            </div>
            <div style={{ flex: 1, padding: '0 10px' }}>
              <input
                type="text"
                value={row.value}
                onChange={(e) => handleInputChange(index, 'value', e.target.value)}
                placeholder="Value"
                style={{
                  width: '100%',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '10px' }}>
        <Button onClick={handleAddRow}>Add Row</Button>
        <Button primary onClick={handleSave} style={{ marginLeft: '10px' }}>
          Save Metafields
        </Button>
      </div>
    </div>
  );
}
