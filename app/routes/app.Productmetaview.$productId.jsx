import * as React from "react";
import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import "./css/metaview.css";
import { json } from "@remix-run/node";
import {
  Card,
  Select,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Loader function to fetch product and metafields data
export const loader = async ({ params, request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const productId = `gid://shopify/Product/${params.productId}`;

    const metafieldsQuery = `
      query getProductById {
        product(id: "${productId}") {
          title
          metafields(first: 250) { 
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
      }`;

    const productResponse = await admin.graphql(metafieldsQuery);
    const productData = await productResponse.json();

    return json({
      product: productData.data.product,
      metafields: productData.data.product.metafields.edges,
    });
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return json({
      product: null,
      metafields: [],
    });
  }
};

// Function to update metafields
async function updateMetafields(admin, productId, editedFields) {
  try {
    // Construct the metafields array for the mutation input
    const updatedMetafields = editedFields.map((field) => ({
      id: field.id,
      value: field.value,
    }));

    // Create the mutation query string
    const updateQuery = `
      mutation {
        productUpdate(
          input: {
            id: "${productId}",
            metafields: ${JSON.stringify(updatedMetafields).replace(/"([^"]+)":/g, '$1:')}
          }
        ) {
          product {
            id
            metafields(first: 10) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Execute the mutation using the admin graphql API
    const response = await admin.graphql(updateQuery);
    const result = await response.json();

    // Check for user errors in the response
    if (result.errors || (result.data.productUpdate && result.data.productUpdate.userErrors.length > 0)) {
      throw new Error(result.errors || result.data.productUpdate.userErrors.map(err => err.message).join(", "));
    }

    console.log("Metafields updated successfully:", result);
    return result;
  } catch (error) {
    console.error("Error updating metafields:", error.message || error);
    throw new Error("Failed to update metafields. " + (error.message || error));
  }
}

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;

  // Local state to track editable data
  const [editedFields, setEditedFields] = useState(
    metafields.map((field) => ({
      ...field.node,
    }))
  );

  // Handle input changes for editable metafields
  const handleInputChange = (index, key, value) => {
    const newFields = [...editedFields];
    newFields[index][key] = value;
    setEditedFields(newFields);
  };

  // Handle saving of edited metafields
  const handleSave = async () => {
    if (!product || !product.id) {
      console.error("Product ID is missing.");
      return;
    }

    try {
      // Get the admin object using authenticate.admin(request)
      const { admin } = await authenticate.admin();
      await updateMetafields(admin, product.id, editedFields);
      console.log("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error.message || error);
    }
  };

  // Options for the select dropdown
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
    <div className="meta-container">
      <Card padding="300">
        <h4 className="product-title">{product ? product.title : "No product data available."}</h4>
        <div className="meta-count">
          <p>Metafields: {metafields.length}</p>
        </div>
      </Card>
      <div className="meta-table">
        <div className="meta-header">
          <div className="meta-cell-title">Type</div>
          <div className="meta-cell-title">Namespace</div>
          <div className="meta-cell-title">Key</div>
          <div className="meta-cell-title">Value</div>
        </div>

        {editedFields && editedFields.length > 0 ? (
          editedFields.map((field, index) => (
            <div className="meta-row" key={index}>
              <div className="meta-cell">
                <Select
                  options={typeOptions}
                  onChange={(value) => handleInputChange(index, "type", value)}
                  value={field.type}
                />
              </div>
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.namespace}
                  onChange={(e) =>
                    handleInputChange(index, "namespace", e.target.value)
                  }
                />
              </div>
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) =>
                    handleInputChange(index, "key", e.target.value)
                  }
                />
              </div>
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) =>
                    handleInputChange(index, "value", e.target.value)
                  }
                />
              </div>
            </div>
          ))
        ) : (
          <div>No metafields available.</div>
        )}
      </div>
      <Button className="submitbutton" onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
}
