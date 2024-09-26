import React, { useState } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get productId
import { Button, Card, Select } from "@shopify/polaris";

export default function DynamicRowsWithProductId() {
  // Get productId from URL parameters
  const { productId } = useParams();

  // State to hold rows of metafields
  const [rows, setRows] = useState([
    { type: "", namespace: "", key: "", value: "" }
  ]);

  // Handle input change for each row
  const handleInputChange = (index, key, value) => {
    const newRows = [...rows];
    newRows[index][key] = value;
    setRows(newRows);
  };

  // Handle adding a new row
  const handleAddRow = () => {
    setRows([...rows, { type: "", namespace: "", key: "", value: "" }]);
  };

  // Handle save button click
  const handleSave = () => {
    console.log("Product ID:", productId);
    console.log("Current rows data:", rows);
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
    { label: "URL", value: "url" }
  ];

  return (
    <div>
   
      <h4 className="product-title">Add New Metafields for Product ID: {productId}</h4>
  
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
                value={row.namespace}
                onChange={(e) => handleInputChange(index, "namespace", e.target.value)}
              />
            </div>
            <div className="meta-cell">
              <input
                type="text"
                value={row.key}
                onChange={(e) => handleInputChange(index, "key", e.target.value)}
              />
            </div>
            <div className="meta-cell">
              <input
                type="text"
                value={row.value}
                onChange={(e) => handleInputChange(index, "value", e.target.value)}
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
