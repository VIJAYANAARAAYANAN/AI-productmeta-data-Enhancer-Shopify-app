import * as React from "react";
import { useState } from "react";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import "./css/metaview.css";
import { json } from "@remix-run/node";
import { Card, Select, Button, Modal } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import deleteicon from "./assets/delete.svg";
import loadergif from "./assets/loader.gif";
import copyicon from "./assets/copy.svg";
import lineicon from "./assets/line.svg";
import { DataType } from "@shopify/shopify-api";

// Loader function to fetch product and metafields data
export const loader = async ({ params, request }) => {
  console.log("params received in MetaView loader", params);
  const { admin } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.productId}`;

  const metafieldsQuery = `
    query getProductById {
      product(id: "${productId}") {
        id
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
    console.log(
      "Product metafields data from loader",
      productData.data.product.metafields.edges,
    );
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

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  console.log("Raw Request obtained", request);
  // Parse JSON body
  let body;
  try {
    body = await request.json();
    console.log("Parsed JSON body:", body);
  } catch (err) {
    console.error("Error parsing JSON:", err);
    return json({ error: "Invalid JSON format." }, { status: 400 });
  }

  const { actionType, metafields, productId, metafieldId } = body;
  console.log("Action type:", actionType);
  console.log("Product ID:", productId);
  console.log("Metafields in body:", metafieldId);

  if (actionType === "update") {
    console.log("ACTION FUNCTION FOR UPDATE HAS BEEN TRIGGERED");

    // Format metafields with the required transformations
    const formattedMetafields = metafields.map((metafield) => {
      if (
        metafield &&
        metafield.id &&
        metafield.key &&
        metafield.namespace &&
        metafield.type &&
        metafield.value !== undefined
      ) {
        let valueToSend;
        switch (metafield.type) {
          case "boolean":
          case "number_integer":
          case "number_decimal":
          case "color":
          case "single_line_text_field":
          case "multi_line_text_field":
          case "url":
          case "json":
            valueToSend = JSON.stringify(metafield.value); // Use JSON.stringify for escape
            break;
          case "date":
            const date = new Date(metafield.value);
            if (!isNaN(date.getTime())) {
              valueToSend = JSON.stringify(date.toISOString().split("T")[0]);
            } else {
              throw new Error("Invalid date format");
            }
            break;
          default:
            throw new Error("Unsupported metafield type");
        }

        return `
          {
            id: "${metafield.id}",
            value: ${valueToSend},
            namespace: "${metafield.namespace}",
            key: "${metafield.key}",
            type: "${metafield.type}"
          }
        `;
      } else {
        throw new Error("Invalid metafield data");
      }
    });

    console.log("Formatted Metafields:", formattedMetafields);

    // Construct the mutation with embedded productId and formattedMetafields
    const mutation = `
      mutation {
        productUpdate(input: {
          id: "${productId}",
          metafields: [${formattedMetafields.join(",")}]
        }) {
          userErrors {
            field
            message
          }
        }
      }
    `;

    try {
      console.log("Generated mutation with embedded data:", mutation);
      const response = await admin.graphql(mutation);

      // Log raw response
      console.log("Raw response from GraphQL:", response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response not OK:", response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Response in JSON format:", responseData);

      // Check for userErrors in the GraphQL response
      if (
        responseData.errors ||
        (responseData.data.productUpdate &&
          responseData.data.productUpdate.userErrors.length > 0)
      ) {
        const errors = responseData.data.productUpdate.userErrors;
        return json(
          { error: errors.map((err) => err.message).join(", ") },
          { status: 500 },
        );
      }

      return json({ success: true });
    } catch (error) {
      console.error("Error updating metafields:", error);
      return json({ error: "Error updating metafields" }, { status: 500 });
    }
  }

  //DELETE PART OF THE ACTION FUNCTION
  else if (actionType === "delete") {
    console.log("Delete part of action triggered");
    const deleteMutation = `
  mutation {
    metafieldDelete(input: { id: "${metafieldId}" }) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

    try {
      console.log(
        "Executing delete mutation with embedded ID:",
        deleteMutation,
      );
      const response = await admin.graphql(deleteMutation);
      const responseData = await response.json();

      if (
        responseData.errors ||
        (responseData.data.metafieldDelete &&
          responseData.data.metafieldDelete.userErrors.length > 0)
      ) {
        const errors = responseData.data.metafieldDelete.userErrors;
        return json(
          { error: errors.map((err) => err.message).join(", ") },
          { status: 500 },
        );
      }

      return json({ success: true });
    } catch (error) {
      console.error("Error deleting metafield:", error);
      return json({ error: "Error deleting metafield" }, { status: 500 });
    }
  }

  return json({ error: "Invalid action type" }, { status: 400 });
};

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;

  const productId = product.id.split("/")[4];
  // console.log("Product ID from the productmetaview", productId);

  const [showModal, setShowModal] = useState(false);
  const [confirmationModalActive, setConfirmationModalActive] = useState(false); // State for the confirmation modal
  const [loaderview, setloaderview] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState("Copy Crystal code");
  const [errormessage, setErrorMessage] = useState("");
  const [successmessage , setSuccessmessage] = useState("");
  const [errorfound, seterrorfound] = useState(false);
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [metafieldToDelete, setMetafieldToDelete] = useState(null); // Store the metafield to delete

  const [editedFields, setEditedFields] = useState(
    metafields.map((field) => ({
      ...field.node,
    })),
  );

  // console.log("Editted metafields on main function", editedFields);

  const [successModalActive, setSuccessModalActive] = useState(false);

  const handleInputChange = (index, key, value) => {
    const newFields = [...editedFields];
    console.log("New fields that are changed", newFields);
    newFields[index][key] = value;
    setEditedFields(newFields);
  };

  // Function to open the confirmation modal
  const openConfirmationModal = () => {
    setConfirmationModalActive(true);
    seterrorfound(false);
  };

  const handleConfirmSave = async () => {
    seterrorfound(false);
    setloaderview(true);
    console.log("Handle Confirm Save has been triggered");
  
    // Prepare the request body
    const requestBody = {
      actionType: "update",
      productId: product?.id,
    };
  
    // Check editedFields content
    if (!Array.isArray(editedFields) || editedFields.length === 0) {
      console.error("editedFields is empty or not an array:", editedFields);
      setErrorMessage("No metafields to update.");
      seterrorfound(true);
      setloaderview(false);
      return; // Stop further processing
    }
  
    // Add metafields to the request body
    requestBody.metafields = editedFields.map((metafield) => {
      if (
        metafield &&
        metafield.id &&
        metafield.key &&
        metafield.namespace &&
        metafield.type &&
        metafield.value !== undefined
      ) {
        // Convert the value to the correct type based on the metafield type
        let valueToSend;
  
        switch (metafield.type) {
          case "boolean":
          case "number_integer":
            valueToSend = metafield.value; // Convert to integer
            break;
          case "number_decimal":
            valueToSend = metafield.value; // Decimal Keep it as String
            break;
          case "color":
          case "single_line_text_field":
          case "multi_line_text_field":
          case "url":
            valueToSend = metafield.value; // Keep as string
            break;
          case "json":
            valueToSend = metafield.value;
            break;
          case "date":
            const date = new Date(metafield.value);
            if (!isNaN(date.getTime())) {
              valueToSend = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
            } else {
              console.error("Invalid date format:", metafield.value);
              setErrorMessage("Invalid date format for metafield.");
              seterrorfound(true);
              setloaderview(false);
              throw new Error("Invalid date format");
            }
            break;
          default:
            console.error("Unsupported metafield type:", metafield.type);
            setErrorMessage("Unsupported metafield type.");
            seterrorfound(true);
            setloaderview(false);
            throw new Error("Unsupported metafield type");
        }
  
        return {
          id: metafield.id,
          value: valueToSend,
          namespace: metafield.namespace,
          key: metafield.key,
          type: metafield.type,
        };
      } else {
        console.error("Invalid metafield data:", metafield);
        setErrorMessage("One or more metafields are invalid.");
        seterrorfound(true);
        setloaderview(false);
        throw new Error("Invalid metafield data");
      }
    });
  
    try {
      const response = await fetch(
        `/app/Productmetaview/${product.id.split("/")[4]}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody), // Send JSON
        },
      );
  
      // Check for HTTP errors
      if (response.ok) {
        // If the response is OK, proceed to show success message
        console.log("Metafields updated successfully!");
        setSuccessmessage("Metafields updated successfully!");
  
        // Close confirmation modal and open success modal
        setConfirmationModalActive(false);
        setSuccessModalActive(true);
        setloaderview(false);
  
        // Automatically close success modal after a delay
        setTimeout(() => {
          setSuccessModalActive(false);
        }, 2000);
      } else {
        // If the response is not OK, handle the error
        console.error("Failed to save metadata with status:", response.status);
        setErrorMessage("Failed to save metadata");
        seterrorfound(true);
      }
    } catch (error) {
      setErrorMessage("Sorry, failed to save metafield");
      seterrorfound(true);
      console.error("Failed to save metafields:", error.message);
    } finally {
      setloaderview(false); // Ensure the loader is stopped
    }
  };
  

  // Function to discard the changes
  const handleDiscard = () => {
    setConfirmationModalActive(false);
  };

  const handleConfirmDelete = async () => {
    setDeleteModalActive(false);
    setloaderview(true);
    console.log("Confirm Delete action triggered for productID", product.id);
    console.log("Metafield to delete are", metafieldToDelete);
    try {
      const response = await fetch(
        `/app/Productmetaview/${product.id.split("/")[4]}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            actionType: "delete",
            metafieldId: metafieldToDelete,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server responded with an error page:", errorText);
      }

      if (response.ok) {
        console.log("Metafield deleted successfully!", response);

        // Update the local state to remove the deleted metafield
        setEditedFields((prevFields) =>
          prevFields.filter((field) => field.id !== metafieldToDelete),
        );
        setloaderview(false);
      } else {
        const errorData = await response.json();
        console.error("Error deleting metafield:", errorData.error);
        setloaderview(false);
      }
    } catch (error) {
      console.error("Failed to delete metafield:", error.message);
      setloaderview(false);
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
    // { label: "Money", value: "money" },
    // { label: "Link", value: "link" },
    { label: "JSON", value: "json" },
    // { label: "Dimension", value: "dimension" },
    { label: "URL", value: "url" },
  ];

  const navigate = useNavigate();

  const handleCreatemeta = () => {
    console.log("Create MetaField is clicked", productId);
    navigate(`/app/ProductMetafieldAdd/${productId}`);
  };

  const handleDeleteClick = (metafieldId) => {
    setMetafieldToDelete(metafieldId);
    setDeleteModalActive(true);
  };

  //HANDLE CLIPBOARD COPYING FUNCTION::

  const handleCopyClick = (namespace, key) => {
    // Generate the Liquid code to be copied
    const liquidCode = `{{ product.metafields["${namespace}"]["${key}"].value }}`;

    // Create a temporary textarea element to copy the text
    const tempInput = document.createElement("textarea");
    tempInput.value = liquidCode;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    // Update the tooltip message to "Copied!"
    setTooltipMessage("Copied!");

    // Revert back to the original message after a delay
    setTimeout(() => {
      setTooltipMessage("Copy Crystal code");
    }, 2000);
  };

  return (
    <div className="meta-container">
      <Card padding="300">
        {/* <div className="headviewtitle">
          <img src={backarrow} alt="backarrow"/>
          <h3 className="product-title">Update Metafields</h3>
        </div> */}
        <h4 className="product-title">
          {product ? product.title : "No product data available."}
        </h4>
        <div className="metaaddition">
          <p className="meta-count">Metafields: {metafields.length}</p>
          <Button variant="primary" onClick={handleCreatemeta}>
            Create Metafield
          </Button>
        </div>
      </Card>

      <div className="viewmeta-header">
        <div className="meta-cell-title">Type</div>
        <div className="meta-cell-title">Namespace</div>
        <div className="meta-cell-title">Key</div>
        <div className="meta-cell-title">Value</div>
      </div>

      <div className="meta-table">
        {editedFields && editedFields.length > 0 ? (
          editedFields.map((field, index) => (
            <div className="meta-row" key={field.id}>
              {/* Type Selector */}
              <div className="meta-cell">
                <Select
                  options={typeOptions}
                  onChange={(value) => handleInputChange(index, "type", value)}
                  value={field.type}
                />
              </div>

              {/* Namespace (Read-Only) */}
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.namespace}
                  readOnly
                  style={{
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              {/* Key (Read-Only) */}
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.key}
                  readOnly
                  style={{
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              {/* Value (Conditional Input Types) */}
              <div className="meta-cell">
                {field.type === "single_line_text_field" ? (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    placeholder="Enter text"
                  />
                ) : field.type === "multi_line_text_field" ? (
                  <textarea
                    className="textareabox"
                    value={field.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    placeholder="Enter text"
                  />
                ) : field.type === "number_integer" ||
                  field.type === "number_decimal" ? (
                  <input
                    type="number"
                    value={field.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    step={field.type === "number_decimal" ? "0.01" : "1"}
                    placeholder="Enter number"
                  />
                ) : field.type === "date" ? (
                  <input
                    type="date"
                    value={field.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                  />
                ) : field.type === "color" ? (
                  <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="color"
                    value={field.value.startsWith("#") ? field.value : `#${field.value}`}
                    onChange={(e) => handleInputChange(index, "value", e.target.value)}
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
                    value={field.value.startsWith("#") ? field.value : `#${field.value}`}
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
                
                ) : field.type === "boolean" ? (
                  <select
                    className="boolenType"
                    value={field.value} // Use the current value directly (it should be "true" or "false")
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    } // Pass the string value directly
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : field.type === "link" || field.type === "url" ? (
                  <input
                    type="url"
                    value={field.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    placeholder="Enter URL"
                  />
                ) : (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
                    placeholder="Enter value"
                  />
                )}
              </div>

              {/* Delete, Copy, and Line Icons */}
              <div className="delete-cell">
                <div className="icon-container">
                  <img
                    src={deleteicon}
                    className="delete-icon"
                    alt="Delete Row"
                    onClick={() => handleDeleteClick(field.id)}
                  />
                </div>
                <div className="lineicon">
                  <img src={lineicon} alt="lineicon" />
                </div>
                <div className="icon-container">
                  <img
                    src={copyicon}
                    className="copy-icon"
                    alt="Copy"
                    onClick={() => handleCopyClick(field.namespace, field.key)}
                  />
                  <span className="tooltip-message">{tooltipMessage}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="Nometadata">No metafields available.</div>
        )}
      </div>

      <div className="button-container">
        <Button
          className="submitbutton"
          onClick={openConfirmationModal}
          variant="primary"
        >
          Save Changes
        </Button>
      </div>

      {/* Confirmation Modal */}
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
            {errorfound && <p>{errormessage}</p>}
          </div>
        </Modal.Section>
      </Modal>

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

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalActive}
        onClose={() => setDeleteModalActive(false)}
        title="Confirm Delete"
        primaryAction={{
          content: "Delete",
          onAction: handleConfirmDelete,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <p>Are you sure you want to delete this metafield?</p>
        </Modal.Section>
      </Modal>
    </div>
  );
}
