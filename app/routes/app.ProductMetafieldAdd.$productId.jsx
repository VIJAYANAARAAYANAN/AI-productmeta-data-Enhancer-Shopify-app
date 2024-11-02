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
        const parsedValue = JSON.parse(value);
        formattedValue = `"{\\"value\\":\\"${parsedValue.value}\\",\\"scale_min\\":\\"${parsedValue.scale_min}\\",\\"scale_max\\":\\"${parsedValue.scale_max}\\"}"`;
      } else {
        // Escape inner quotes for non-rating types
        formattedValue = value.replace(/"/g, '\\"');
      }

      return `{
          namespace: "${namespace}",
          key: "${key}",
          value: ${formattedValue},
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

    // Check if the row type is "rating"
    if (newRows[index].type === "rating") {
      // Parse existing rating JSON or use defaults if empty
      const parsedValue = newRows[index].value
        ? JSON.parse(newRows[index].value)
        : { scale_min: 0, scale_max: 5, value: 0 };

      // Update the specific key (scale_min, scale_max, value, or key)
      if (key === "scale_min" || key === "scale_max" || key === "value") {
        parsedValue[key] = value; // Update the specific rating property
        newRows[index].value = JSON.stringify(parsedValue); // Update value
      } else {
        newRows[index][key] = value; // This will handle key updates
      }
    } else {
      // Handle other row types normally
      if (newRows[index].type === "boolean" && !newRows[index].value) {
        newRows[index].value = "True"; // Default to "True" if no value
      }
      newRows[index][key] = value; // Update for non-rating types
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
    const metafields = rows.map((row) => ({
      namespace: row.namespace,
      key: row.key,
      value: row.value,
      type: row.type,
    }));

    console.log("Metafields to be sent:", metafields); // Log metafields to be sent
    // Send metafields to the action function (using form submission)
    const formData = new FormData();

    formData.append("metafields", JSON.stringify(metafields));
    console.log("Formdata to be saved", formData);
    console.log("Passing POST request on the URL /app/ProductMetafieldAdd/ ", {
      productId,
    });
    // Create a POST request to trigger the action function
    fetch(`/app/ProductMetafieldAdd/${productId}`, {
      method: "POST",
      body: formData,
    }).then((response) => {
      if (response.ok) {
        console.log("Metafields successfully updated!"); // Log success message
        setConfirmationModalActive(false);
        setloaderview(false);
        setIsPopupVisible(true);
        // window.location.reload();
      } else {
        console.error("Error updating metafields"); // Log error message
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
              ) : row.type === "money" ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ marginRight: "5px", fontWeight: "bold" }}>
                    INR
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={row.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    placeholder="Enter Amount"
                    style={{
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      flex: "1",
                    }}
                  />
                </div>
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
              ) : row.type === "link" ? (
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
              ) : row.type === "dimension" ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="number"
                    value={row.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    placeholder="Enter Dimension"
                    style={{
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      flex: "1",
                    }}
                  />
                  <select
                    onChange={(e) =>
                      handleInputChange(index, "unit", e.target.value)
                    }
                    style={{
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      marginLeft: "5px",
                    }}
                  >
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                    <option value="m">m</option>
                    {/* Add more units as needed */}
                  </select>
                </div>
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
                  let parsedValue = { scale_min: 0, scale_max: 5, value: 0 };

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
