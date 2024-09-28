import * as React from "react";
import { useState } from "react";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import "./css/metaview.css";
import { json } from "@remix-run/node";
import { Card, Select, Button, Modal } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import deleteicon from "./assets/delete.svg";
import loadergif from './assets/loader.gif';

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
            metafields: ${JSON.stringify(updatedMetafields).replace(/"([^"]+)":/g, "$1:")}
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

  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [metafieldToDelete, setMetafieldToDelete] = useState(null); // Store the metafield to delete

  const [editedFields, setEditedFields] = useState(
    metafields.map((field) => ({
      ...field.node,
    })),
  );

  console.log("Editted metafields on main function", editedFields);

  const [successModalActive, setSuccessModalActive] = useState(false);

  const handleInputChange = (index, key, value) => {
    const newFields = [...editedFields];
    newFields[index][key] = value;
    setEditedFields(newFields);
  };

  // Function to open the confirmation modal
  const openConfirmationModal = () => {
    setConfirmationModalActive(true);
  };

  // Function to handle confirmation of save action
  const handleConfirmSave = async () => {
    setloaderview(true);
    try {
 
      const response = await fetch(
        `/app/Productmetaview/${product.id.split("/")[4]}`,
        {
          method: "POST",
          body: new URLSearchParams({
            actionType: "update",
            metafields: JSON.stringify(editedFields),
            productId: product.id,
          }),
        },
      );

      if (response.ok) {
        console.log("Response from the POST on Confirm change", response);
        setConfirmationModalActive(false);
        setSuccessModalActive(true);
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
        window.location.reload();
        // Update state or refresh the page to reflect the change
      } else {
        const errorData = await response.json();
        console.error("Error deleting metafield:", errorData.error);
      }
    } catch (error) {
      console.error("Failed to delete metafield:", error.message);
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
                  readOnly
                  style={{
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
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
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) =>
                    handleInputChange(index, "value", e.target.value)
                  }
                />
              </div>
              <div className="delete-cell">
                <img
                  src={deleteicon}
                  className="delete-icon"
                  alt="Delete Row"
                  onClick={() => handleDeleteClick(field.id)}
                />
              </div>
            </div>
          ))
        ) : (
          <div>No metafields available.</div>
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
            <img className="loadergif" src={loadergif} alt="Creating Metafields"/>
          )}
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
