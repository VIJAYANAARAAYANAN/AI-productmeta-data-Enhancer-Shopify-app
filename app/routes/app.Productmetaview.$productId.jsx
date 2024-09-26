import * as React from "react";
import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import "./css/metaview.css";
import { json } from "@remix-run/node";
import { Card, Select, Button, Modal } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Loader function to fetch product and metafields data
export const loader = async ({ params, request }) => {
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

  try {
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

// Action function to update metafields
export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const updatedMetafields = JSON.parse(formData.get("metafields"));
  const productId = formData.get("productId");

  const mutation = `
  mutation {
    productUpdate(
      input: {
        id: "${productId}",
        metafields: ${JSON.stringify(updatedMetafields).replace(/"([^"]+)":/g, '$1:')}
      }
    ) {
      userErrors {
        field
        message
      }
    }
  }`;

  try {
    const response = await admin.graphql(mutation);
    const responseData = await response.json();

    if (responseData.errors || (responseData.data.productUpdate && responseData.data.productUpdate.userErrors.length > 0)) {
      const errors = responseData.data.productUpdate.userErrors;
      return json({ error: errors.map(err => err.message).join(", ") }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error saving metafields:", error);
    return json({ error: "Error saving metafields" }, { status: 500 });
  }
};

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;

  const [editedFields, setEditedFields] = useState(
    metafields.map((field) => ({
      ...field.node,
    }))
  );

  const [successModalActive, setSuccessModalActive] = useState(false);

  const handleInputChange = (index, key, value) => {
    const newFields = [...editedFields];
    newFields[index][key] = value;
    setEditedFields(newFields);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/app/Productmetaview/${product.id.split("/")[4]}`, {
        method: "POST",
        body: new URLSearchParams({
          metafields: JSON.stringify(editedFields),
          productId: product.id,
        }),
      });

      if (response.ok) {
        // Show the success modal
        setSuccessModalActive(true);
        
        // Hide the modal after 3 seconds
        setTimeout(() => {
          setSuccessModalActive(false);
        }, 3000);
      } else {
        const errorData = await response.json();
        console.error("Error saving metafields:", errorData.error);
      }
    } catch (error) {
      console.error("Failed to save metafields:", error.message);
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
            <div className="meta-row" key={field.id}>
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
                  onChange={(e) => handleInputChange(index, "namespace", e.target.value)}
                />
              </div>
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => handleInputChange(index, "key", e.target.value)}
                />
              </div>
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleInputChange(index, "value", e.target.value)}
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

      {/* Success Modal */}
      <Modal
        open={successModalActive}
        onClose={() => setSuccessModalActive(false)}
        title="Success"
        primaryAction={{
          content: "Close",
          onAction: () => setSuccessModalActive(false),
        }}
      >
        <Modal.Section>
          <p>Metafields updated successfully!</p>
        </Modal.Section>
      </Modal>
    </div>
  );
}
