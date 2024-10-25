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

// Action function to update metafields
export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "update") {
    const updatedMetafields = JSON.parse(formData.get("metafields"));
    const productId = formData.get("productId");

    const mutation = `
    mutation {
      productUpdate(
        input: {
          id: "${productId}",
          metafields: [
            ${updatedMetafields
              .map(
                (metafield) => `
              {
                id: "${metafield.id}",
                value: "${metafield.value}",
                namespace: "${metafield.namespace}",
                key: "${metafield.key}",
                type: "${metafield.type}"
              }
            `,
              )
              .join(",")}
          ]
        }
      ) {
        userErrors {
          field
          message
        }
      }
    }
  `;

    try {
      const response = await admin.graphql(mutation);
      const responseData = await response.json();

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
      console.error("Error saving metafields:", error);
      return json({ error: "Error saving metafields" }, { status: 500 });
    }
  }
  //DELETING PART OF THE ACTION CODE:
  else if (actionType === "delete") {
    console.log("Deleting action has been initiated");
    const metafieldId = formData.get("metafieldId");
    console.log("Metafield to be deleted is", metafieldId);
    const deleteMutation = `
      mutation {
        metafieldDelete(input: {
          id: "${metafieldId}"
        }) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }`;

    try {
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
  console.log("Product ID from the productmetaview", productId);

  const [showModal, setShowModal] = useState(false);
  const [confirmationModalActive, setConfirmationModalActive] = useState(false); // State for the confirmation modal
  const [loaderview, setloaderview] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState("Copy Crystal code");
  const [errormessage, setErrorMessage] = useState("");
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
    newFields[index][key] = value;
    setEditedFields(newFields);
  };

  // Function to open the confirmation modal
  const openConfirmationModal = () => {
    setConfirmationModalActive(true);
    seterrorfound(false);
  };

  // Function to handle confirmation of save action
  const handleConfirmSave = async () => {
    seterrorfound(false);
    setloaderview(true);
    console.log("Handle Confirm Save have been triggered");
    console.log("Edited fields being sent json:", JSON.stringify(editedFields));
    console.log("Product id that is used in handleConfirmSave", product.id.split("/")[4]);

    try {
      const response = await fetch(
        `/app/Productmetaview/${product.id.split("/")[4]}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json", // Ensure you're sending JSON
          },
          body: JSON.stringify({
            actionType: "update",
            metafields: editedFields, // Keep this as an object/array, no need for extra JSON.stringify
            productId: product.id,
          }),
        },
      );

      console.log("actual response", response);
      if (response.ok) {
        console.log("Response from the POST on Confirm change", response);
        seterrorfound(false);
        setConfirmationModalActive(false);
        setSuccessModalActive(true);
        setloaderview(false);
        setTimeout(() => {
          setSuccessModalActive(false);
        }, 3000);
      } else {
        console.log("THE POST IN THE HANDLECONFIRMSAVE FAILED");
        setloaderview(false);
        setErrorMessage("Failed to save metadata");
        seterrorfound(true);
        const errorData = await response.json();
        console.error("Error saving metafields:", errorData.error);
      }
    } catch (error) {
      setErrorMessage("Sorry failed to save metafield");
      seterrorfound(true);
      console.error("Failed to save metafields:", error.message);
    }
  };

  // Function to discard the changes
  const handleDiscard = () => {
    setConfirmationModalActive(false);
  };

  const handleConfirmDelete = async () => {
    setDeleteModalActive(false);
    setloaderview(true);
    try {
      const response = await fetch(
        `/app/Productmetaview/${product.id.split("/")[4]}`,
        {
          method: "POST",
          body: new URLSearchParams({
            actionType: "delete",
            metafieldId: metafieldToDelete,
          }),
        },
      );

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
    { label: "Money", value: "money" },
    { label: "Link", value: "link" },
    { label: "JSON", value: "json" },
    { label: "Dimension", value: "dimension" },
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
                  <input
                    type="text"
                    value={
                      field.value.startsWith("#")
                        ? field.value
                        : `#${field.value}`
                    }
                    onChange={(e) => {
                      let colorValue = e.target.value;
                      if (!colorValue.startsWith("#")) {
                        colorValue = `#${colorValue}`;
                      }
                      handleInputChange(index, "value", colorValue);
                    }}
                    maxLength="7"
                    placeholder="#000000"
                  />
                ) : field.type === "boolean" ? (
                  <select
                    className="boolenType"
                    value={field.value}
                    onChange={(e) =>
                      handleInputChange(index, "value", e.target.value)
                    }
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
