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

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;
  
  // Local state to track editable data
  const [editedFields, setEditedFields] = useState(metafields.map(field => ({
    ...field.node
  })));

  const handleInputChange = (index, key, value) => {
    const newFields = [...editedFields];
    newFields[index][key] = value;
    setEditedFields(newFields);
  };

  const handleSave = () => {
    // Perform save logic (mutation or API call to update metafields)
    console.log("Saving edited metafields:", editedFields);
    console.log(metafields);
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
      <Button className="submitbutton" onClick={handleSave}>Save Changes</Button>
    </div>
  );
}
