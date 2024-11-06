import React, { useState } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get productId
import { Button, Card, Select, Modal } from "@shopify/polaris";
import "../routes/css/metafieldadd.css";
import { authenticate } from "../shopify.server";
import { useLoaderData, redirect } from "@remix-run/react";
import { json } from "@remix-run/node"; // Import useLoaderData
import deleteicon from "./assets/delete.svg";
import loadergif from "./assets/loader.gif";
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

  console.log("Form Data received on action", formData);
  console.log("Product_id of ", productId);
  console.log("Metafields Fetched on Action ", metafields);

  const metafieldsString = metafields
    .map(({ namespace, key, value, type }) => {
      // Ensure value is formatted correctly for "rating" type
      let formattedValue;

      if (type === "rating") {
        // Parse the value, or set default values if it's an empty string
        let parsedValue =
          value && value.trim() !== ""
            ? JSON.parse(value)
            : { scale_min: 0.0, scale_max: 5.0, value: 0.0 };

        formattedValue = `{\\"value\\":\\"${parsedValue.value}\\",\\"scale_min\\":\\"${parsedValue.scale_min}\\",\\"scale_max\\":\\"${parsedValue.scale_max}\\"}`;
      } else if (type === "boolean") {
        formattedValue = `${value === "True" ? "true" : "false"}`;
      } else if (type === "multi_line_text_field") {
        formattedValue = `${value.replace(/\n/g, "\\n")}`;
      } else {
        formattedValue = value.replace(/"/g, '\\"');
      }

      return `{
          namespace: "${namespace}",
          key: "${key}",
          value: "${formattedValue}",
          type: "${type}"
        }`;
    })
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
    console.log("The mutation query on the action with data", mutation);
    const result = await admin.graphql(mutation);

    if (result.errors) {
      console.error("Mutation errors:", result.errors);
      return json({ success: false, message: "Failed to apply metafields" });
    }

    return json({
      success: true,
      message: "Metafields applied successfully!",
      result: result.data,
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

  const [confirmationModalActive, setConfirmationModalActive] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [loaderview, setloaderview] = useState(false);
  const [warnings, setWarnings] = useState({});

  const [rows, setRows] = useState([
    {
      type: "single_line_text_field",
      namespace: "cartesian",
      key: "",
      value: "",
    },
  ]);

  // Handle input change for each row
  const handleInputChange = (index, key, value) => {
    const newRows = [...rows];

    if (newRows[index].type === "rating") {
      console.log("RATING TEST", newRows[index]);
      const parsedValue = newRows[index].value
        ? JSON.parse(newRows[index].value)
        : { scale_min: 0.0, scale_max: 5.0, value: 0.0 };
      if (key === "scale_min" || key === "scale_max" || key === "value") {
        parsedValue[key] = value;
        newRows[index].value = JSON.stringify(parsedValue);
      } else {
        newRows[index][key] = value;
      }
    } else if (newRows[index].type === "boolean") {
      newRows[index].value = value === "True" ? "True" : "False";
      newRows[index][key] = value;
    } else {
      newRows[index][key] = value;
    }
    console.log("Newly edited rows", newRows);
    setRows(newRows);
  };

  // Handle adding a new row
  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        type: "single_line_text_field",
        namespace: "cartesian",
        key: "",
        value: "",
      },
    ]);
  };

  //Handle Deleting Rows
  const handleDeleteRow = (index) => {
    if (index >= 0) {
      const newRows = rows.filter((_, rowIndex) => rowIndex !== index);
      setRows(newRows);
    }
  };

  const openConfirmationModal = () => {
    setConfirmationModalActive(true);
  };

  // Handle save button click
  const handleConfirmSave = () => {
    console.log("Handle Confirm Save has been clicked");
    setloaderview(true);

    // Validation logic for each metafield type and key presence
    const invalidFields = rows.filter((row) => {
      if (!row.key || row.key.trim() === "") {
        return true; // Invalid if key is missing or empty
      }

      switch (row.type) {
        case "number_integer":
          return (
            isNaN(Number(row.value)) || !Number.isInteger(Number(row.value))
          );

        case "number_decimal":
          return isNaN(Number(row.value)) || row.value.toString().includes(" ");

        case "single_line_text_field":
          return typeof row.value !== "string" || row.value.includes("\n");

        case "multi_line_text_field":
          return typeof row.value !== "string";

        case "url":
          try {
            new URL(row.value);
            return false;
          } catch {
            return true;
          }

        case "boolean":
          return !(
            row.value.toLowerCase() === "true" ||
            row.value.toLowerCase() === "false"
          );

        case "color":
          const colorRegex = /^#([0-9A-F]{3}){1,2}$/i;
          const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
          return !(colorRegex.test(row.value) || rgbRegex.test(row.value));

        case "json":
          try {
            JSON.parse(row.value);
            return false;
          } catch {
            return true;
          }

        case "rating":
          let parsedRating;
          try {
            parsedRating = JSON.parse(row.value); // Parse the JSON string
          } catch {
            return true; // Invalid if parsing fails
          }

          const { scale_min, scale_max, value } = parsedRating;
          const ratingValue = Number(value);

          return (
            isNaN(ratingValue) ||
            ratingValue < scale_min ||
            ratingValue > scale_max
          );

        default:
          return row.value == null || row.value.trim() === "";
      }
    });

    if (invalidFields.length > 0) {
      console.log("Invalid fields:", invalidFields);

      const errorMessages = invalidFields.map((field) => {
        if (!field.key || field.key.trim() === "") {
          return `Field ${field.key || "[no key]"} is missing a key.`;
        }

        switch (field.type) {
          case "number_integer":
            return `Value for field ${field.key} should be a valid integer (no decimals).`;
          case "number_decimal":
            return `Value for field ${field.key} should be a valid decimal number.`;
          case "single_line_text_field":
            return `Value for field ${field.key} should be a single line of text without newlines.`;
          case "multi_line_text_field":
            return `Value for field ${field.key} should be a valid string, allowing newlines.`;
          case "url":
            return `Value for field ${field.key} should be a valid URL.`;
          case "boolean":
            return `Value for field ${field.key} should be 'true' or 'false'.`;
          case "color":
            return `Value for field ${field.key} should be a valid color (e.g., Hex or RGB).`;
          case "json":
            return `Value for field ${field.key} should be valid JSON.`;
          case "rating":
            const parsedField = JSON.parse(field.value); // Parse JSON string for error message
            console.log("Parsed Field on the rating return",parsedField);
            return `Value for field ${field.key} should be a number between ${parsedField.scale_min} and ${parsedField.scale_max}.`;
          default:
            return `Value for field ${field.key} should not be empty.`;
        }
      });

      alert(
        `There are invalid entries in the metafields:\n\n${errorMessages.join("\n")}`
      );

      console.log("Error messages on validation:", errorMessages);
      setloaderview(false);
      return;
    }

    const metafields = rows.map((row) => ({
      namespace: row.namespace,
      key: row.key,
      value: row.value,
      type: row.type,
    }));

    console.log("Metafields to be sent:", metafields);
    const formData = new FormData();
    formData.append("metafields", JSON.stringify(metafields));
    console.log("FormData to be saved", formData);

    fetch(`/app/ProductMetafieldAdd/${productId}`, {
      method: "POST",
      body: formData,
    }).then((response) => {
      if (response.ok) {
        console.log("Metafields successfully updated!");
        setConfirmationModalActive(false);
        setloaderview(false);
        setIsPopupVisible(true);
      } else {
        console.error("Error updating metafields");
      }
    });
  };


  const handleDiscard = () => {
    setConfirmationModalActive(false);
  };

  //FUNCTION TO HANDLE THE JSON FORMATTING FROM USER
  const handleJsonInputChange = (index, rawValue) => {
    let parsedValue;
    try {
      parsedValue = JSON.parse(rawValue); // Parse JSON input
      const stringifiedValue = JSON.stringify(parsedValue); // Convert to JSON string
      console.log("Stringified JSON for Shopify:", stringifiedValue);
      handleInputChange(index, "value", stringifiedValue);
    } catch (error) {
      console.error("Invalid JSON format:", error);
    }
    handleInputChange(index, "displayValue", rawValue);
  };

  const typeOptions = [
    { label: "Single Line Text", value: "single_line_text_field" },
    { label: "Color", value: "color" },
    { label: "Date", value: "date" },
    { label: "Boolean", value: "boolean" },
    { label: "Integer", value: "number_integer" },
    { label: "Decimal", value: "number_decimal" },
    { label: "Multi Line Text", value: "multi_line_text_field" },
    // { label: "Money", value: "money" },
    // { label: "Link", value: "link" },
    { label: "JSON", value: "json" },
    // { label: "Dimension", value: "dimension" },
    { label: "URL", value: "url" },
    { label: "Rating", value: "rating" },
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

      <div className="button-container">
        <Button onClick={handleAddRow} variant="primary">
          Add Row
        </Button>
        <Button
          primary
          onClick={openConfirmationModal}
          style={{ marginLeft: "10px" }}
          variant="primary"
        >
          Save Metafields
        </Button>
      </div>

      <div className="meta-header">
        <div className="meta-cell-title">Type</div>
        <div className="meta-cell-title">Namespace</div>
        <div className="meta-cell-title">Key</div>
        <div className="meta-cell-title">Value</div>
      </div>

      {/* Meta Table as Grid */}
      <div className="meta-table-grid">
        {/* Meta Header */}

        {/* Meta Rows */}
        {rows.map((row, index) => (
          <div className="meta-row-grid" key={index}>
            {/* Type Selector */}
            <div className="meta-cell-grid">
              <Select
                options={typeOptions}
                onChange={(value) => handleInputChange(index, "type", value)}
                value={row.type}
              />
            </div>

            {/* Namespace Field (Read-only) */}
            <div className="meta-cell-grid">
              <input
                type="text"
                value="Cartesian"
                readOnly
                className="readonly-input"
              />
            </div>

            {/* Key Field */}
            <div className="meta-cell-grid">
              <input
                type="text"
                value={row.key}
                onChange={(e) =>
                  handleInputChange(index, "key", e.target.value)
                }
                placeholder="Key"
              />
            </div>

            {/* Value Field */}
            <div
              className="meta-cell-grid"
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {/* Conditional input based on type */}
              {row.type === "date" ? (
                <input
                  type="date"
                  value={row.value}
                  onChange={(e) =>
                    handleInputChange(index, "value", e.target.value)
                  }
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "100%",
                  }}
                />
              ) : row.type === "color" ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="color"
                    value={
                      row.value.startsWith("#") ? row.value : `#${row.value}`
                    }
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    style={{
                      border: "none",
                      padding: "0",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      marginRight: "5px",
                    }}
                  />
                  <input
                    type="text"
                    value={
                      row.value.startsWith("#") ? row.value : `#${row.value}`
                    }
                    onChange={(e) => {
                      let colorValue = e.target.value;
                      if (!colorValue.startsWith("#")) {
                        colorValue = `#${colorValue}`;
                      }
                      handleInputChange(index, "value", colorValue);
                    }}
                    placeholder="#000000"
                    maxLength="7"
                    style={{
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      flex: "1",
                    }}
                  />
                </div>
              ) : row.type === "boolean" ? (
                <select
                  value={row.value || "True"} // Default to "True" if value is empty
                  onChange={(e) =>
                    handleInputChange(index, "value", e.target.value)
                  }
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "100%",
                  }}
                >
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              ) : row.type === "integer" ? (
                <input
                  type="number"
                  value={row.value}
                  onChange={(e) =>
                    handleInputChange(index, "value", e.target.value)
                  }
                  placeholder="Enter Integer"
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "100%",
                  }}
                />
              ) : row.type === "decimal" ? (
                <input
                  type="number"
                  step="0.01"
                  value={row.value}
                  onChange={(e) =>
                    handleInputChange(index, "value", e.target.value)
                  }
                  placeholder="Enter Decimal"
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "100%",
                  }}
                />
              ) : row.type === "multi_line_text_field" ? (
                <textarea
                  value={row.value}
                  onChange={(e) =>
                    handleInputChange(index, "value", e.target.value)
                  }
                  placeholder="Enter multiple lines of text"
                  className="jsontextbox"
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "100%",
                    resize: "vertical",
                  }}
                />
              ) : row.type === "json" ? (
                <textarea
                  value={row.displayValue || row.value} // Show display value or last valid JSON
                  onChange={(e) => handleJsonInputChange(index, e.target.value)}
                  placeholder='{"key": "value"}'
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "100%",
                    resize: "vertical",
                    fontFamily: "monospace",
                    whiteSpace: "pre",
                    backgroundColor: "#f4f4f4",
                    overflowX: "auto",
                  }}
                />
              ) : row.type === "url" ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="url"
                    value={row.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    placeholder="Enter URL"
                    style={{
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      flex: "1",
                    }}
                  />
                  <button
                    onClick={() => window.open(row.value, "_blank")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      marginLeft: "5px",
                      fontSize: "18px",
                    }}
                  >
                    ↗
                  </button>
                </div>
              ) : row.type === "rating" ? (
                (() => {
                  let parsedValue = {
                    scale_min: 0.0,
                    scale_max: 5.0,
                    value: 0.0,
                  };

                  // Check if value is a valid JSON string, otherwise use defaults
                  if (
                    typeof row.value === "string" &&
                    row.value.startsWith("{")
                  ) {
                    try {
                      parsedValue = JSON.parse(row.value);
                    } catch (error) {
                      console.error("Error parsing rating value:", error);
                    }
                  } else {
                    console.warn(
                      "Unexpected format for rating value:",
                      row.value,
                    );
                    parsedValue.value = Number(row.value) || 0;
                  }

                  return (
                    <div
                      className="rating-cell"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "5px",
                      }}
                    >
                      <div className="ratingboxes">
                        <label>Min:</label>
                        <input
                          type="number"
                          value={parsedValue.scale_min}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "scale_min",
                              e.target.value,
                            )
                          }
                          min="0"
                          step="0.1"
                          style={{
                            padding: "8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            width: "60px",
                          }}
                        />
                      </div>
                      <div className="ratingboxes">
                        <label>Max:</label>
                        <input
                          type="number"
                          value={parsedValue.scale_max}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "scale_max",
                              e.target.value,
                            )
                          }
                          min="0"
                          step="0.1"
                          style={{
                            padding: "8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            width: "60px",
                          }}
                        />
                      </div>
                      <div className="ratingboxes">
                        <label>Rating:</label>
                        <input
                          type="number"
                          value={parsedValue.value}
                          onChange={(e) =>
                            handleInputChange(index, "value", e.target.value)
                          }
                          min={parsedValue.scale_min}
                          max={parsedValue.scale_max}
                          step="0.1"
                          style={{
                            padding: "8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            width: "60px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })()
              ) : (
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) =>
                    handleInputChange(index, "value", e.target.value)
                  }
                  placeholder="Value"
                  style={{
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "100%",
                  }}
                />
              )}
            </div>

            <div className="meta-cell-grid delete-cell">
              {index >= 0 && (
                <img
                  src={deleteicon}
                  className="adddelete-icon"
                  alt="Delete Row"
                  onClick={() => handleDeleteRow(index)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal for saving meatfields*/}

      <Modal
        open={confirmationModalActive}
        onClose={() => setConfirmationModalActive(false)}
        title="Confirm Changes"
        primaryAction={{
          content: "Save",
          onAction: handleConfirmSave,
        }}
        secondaryActions={[
          {
            content: "Discard",
            onAction: handleDiscard,
          },
        ]}
      >
        <Modal.Section>
          <p>Do you want to save the changes you made to the metafields?</p>
          <div className="loaderpart">
            {loaderview && (
              <img
                className="loadergif"
                src={loadergif}
                alt="Creating Metafields"
              />
            )}
          </div>
        </Modal.Section>
      </Modal>

      {/* Popup modal after successful metafield created*/}
      {isPopupVisible && (
        <Modal
          open={isPopupVisible}
          onClose={() => setIsPopupVisible(false)}
          title="Success"
          primaryAction={{
            content: "Close",
            onAction: () => setIsPopupVisible(false),
          }}
        >
          <Modal.Section>
            <p>Metafields have been successfully updated!</p>
          </Modal.Section>
        </Modal>
      )}
    </div>
  );
}
