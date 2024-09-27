import React, { useState } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get productId
import { Button, Card, Select } from "@shopify/polaris";
import "../routes/css/metafieldadd.css";
import { authenticate } from "../shopify.server";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
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

export default function DynamicRowsWithProductId() {
  const { productId } = useParams();
  const { product } = useLoaderData(); // Get product data from loader

  const [rows, setRows] = useState([
    { type: "single_line_text_field", namespace: "Cartesian", key: "", value: "" },
  ]);

  // Handle input change for each row
  const handleInputChange = (index, key, value) => {
    const newRows = [...rows];
    newRows[index][key] = value;
    setRows(newRows);
  };

  // Handle adding a new row
  const handleAddRow = () => {
    setRows([...rows, { type: "", namespace: "Cartesian", key: "", value: "" }]);
  };

  // Handle save button click
  const handleSave = () => {
    console.log("Product ID:", productId);
    console.log("Current rows data:", rows);
    // Add your saving logic here (e.g., API call to save metafields)
  };

  // Options for the type dropdown

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

      <div className="meta-table">
        <div className="meta-header">
          <div className="meta-cell-title">Type</div>
          <div className="meta-cell-title">Namespace</div>
          <div className="meta-cell-title">Key</div>
          <div className="meta-cell-title">Value</div>
        </div>

        {rows.map((row, index) => (
          <div className="meta-row" key={index}>
            <div className="meta-cell">
              <Select
                options={typeOptions}
                onChange={(value) => handleInputChange(index, "type", value)}
                value={row.type}
              />
            </div>
            <div className="meta-cell">
                <input
                  type="text"
                  value="Cartesian"
                  readOnly
                  style={{ backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}
                />
              </div>
            <div className="meta-cell">
              <input
                type="text"
                value={row.key}
                onChange={(e) =>
                  handleInputChange(index, "key", e.target.value)
                }
              />
            </div>
            <div className="meta-cell">
              <input
                type="text"
                value={row.value}
                onChange={(e) =>
                  handleInputChange(index, "value", e.target.value)
                }
              />
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleAddRow}>Add New Metafield</Button>
      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  );
}
