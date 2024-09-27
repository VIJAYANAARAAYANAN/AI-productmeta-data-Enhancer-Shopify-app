import * as React from "react";
import { useState } from "react";
import { useLoaderData, Link , useNavigate } from "@remix-run/react";
import "./css/metaview.css";
import { json } from "@remix-run/node";
import { Card, Select, Button, Modal } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import backarrow from './assets/backarrowshop.png'

// Loader function to fetch product and metafields data
export const loader = async ({ params, request }) => {
  console.log("params received in MetaView loader",params);
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

// Action function to update or delete metafields
export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const actionType = formData.get("actionType"); // Check whether it's an update or delete action
  const metafieldId = formData.get("metafieldId"); // Used for delete
  const productId = formData.get("productId");

  if (actionType === "delete" && metafieldId) {
    // Handle deletion of the metafield
    const deleteMutation = `
      mutation {
        metafieldDelete(input: { id: "${metafieldId}" }) {
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

      if (responseData.errors || (responseData.data.metafieldDelete && responseData.data.metafieldDelete.userErrors.length > 0)) {
        const errors = responseData.data.metafieldDelete.userErrors;
        return json({ error: errors.map(err => err.message).join(", ") }, { status: 500 });
      }

      return json({ success: true });
    } catch (error) {
      console.error("Error deleting metafield:", error);
      return json({ error: "Error deleting metafield" }, { status: 500 });
    }
  } else {
    // Handle update of the metafields
    const updatedMetafields = JSON.parse(formData.get("metafields"));

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
  }
};

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;

  const productId = product.id.split("/")[4];
  console.log("Product ID from the productmetaview",productId);

  const [showModal, setShowModal] = useState(false);
  const [confirmationModalActive, setConfirmationModalActive] = useState(false); // State for the confirmation modal
  const [deleteConfirmationModalActive, setDeleteConfirmationModalActive] = useState(false); // State for the delete confirmation modal

  const [editedFields, setEditedFields] = useState(
    metafields.map((field) => ({
      ...field.node,
    }))
  );

  const [successModalActive, setSuccessModalActive] = useState(false);
  const [selectedMetafieldId, setSelectedMetafieldId] = useState(null); // State for the metafield ID to be deleted

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
    setConfirmationModalActive(false);
    try {
      const response = await fetch(`/app/Productmetaview/${product.id.split("/")[4]}`, {
        method: "POST",
        body: new URLSearchParams({
          metafields: JSON.stringify(editedFields),
          productId: product.id,
          actionType: "update", // Specify action type as update
        }),
      });

      if (response.ok) {
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

  // Function to open delete confirmation modal
  const handleDeleteClick = (metafieldId) => {
    setSelectedMetafieldId(metafieldId);
    setDeleteConfirmationModalActive(true);
  };

  // Function to handle deletion of metafield
  const handleDeleteMetafield = async () => {
    setDeleteConfirmationModalActive(false);
    try {
      const response = await fetch(`/app/Productmetaview/${product.id.split("/")[4]}`, {
        method: "POST",
        body: new URLSearchParams({
          actionType: "delete", // Specify action type as delete
          metafieldId: selectedMetafieldId,
          productId: product.id,
        }),
      });

      if (response.ok) {
        setSuccessModalActive(true);
        setTimeout(() => {
          setSuccessModalActive(false);
          // Refresh the page or re-fetch the metafields to reflect the deletion
          window.location.reload(); // Reload the page to update the metafields list
        }, 3000);
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
    console.log("Create MetaField is clicked",productId);
    navigate(`/app/ProductMetafieldAdd/${productId}`);
  }

  return (
    <div className="meta-container">
      <Card padding="300">
        {/* <div className="headviewtitle">
          <img src={backarrow} alt="backarrow"/>
          <h3 className="product-title">Update Metafields</h3>
        </div> */}
        <h4 className="product-title">{product ? product.title : "No product data available."}</h4>
        <div className="metaaddition">
          <p className="meta-count">Metafields: {metafields.length}</p>
          <Button variant="primary" onClick={handleCreatemeta}>Create Metafield</Button>
        </div>
      </Card>
      <div className="meta-table">
        <div className="meta-table-row meta-table-header">
          <div>Namespace</div>
          <div>Key</div>
          <div>Value</div>
          <div>Type</div>
          <div>Actions</div> {/* New column for actions */}
        </div>
        {editedFields.map((field, index) => (
          <div className="meta-table-row" key={field.id}>
            <div>
              <input
                type="text"
                value={field.namespace}
                onChange={(e) =>
                  handleInputChange(index, "namespace", e.target.value)
                }
              />
            </div>
            <div>
              <input
                type="text"
                value={field.key}
                onChange={(e) => handleInputChange(index, "key", e.target.value)}
              />
            </div>
            <div>
              <input
                type="text"
                value={field.value}
                onChange={(e) => handleInputChange(index, "value", e.target.value)}
              />
            </div>
            <div>
              <Select
                options={typeOptions}
                value={field.type}
                onChange={(value) => handleInputChange(index, "type", value)}
              />
            </div>
            <div>
              {/* Delete Button */}
              <button
                className="delete-button"
                onClick={() => handleDeleteClick(field.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="meta-button-group">
        <Button primary onClick={openConfirmationModal}>
          Save
        </Button>
        <Link to="/app/ProductMetaview">
          <Button>Back</Button>
        </Link>
      </div>
      <Modal
        open={confirmationModalActive}
        onClose={handleDiscard}
        title="Save Changes"
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
          <p>Are you sure you want to save the changes?</p>
        </Modal.Section>
      </Modal>
      <Modal
        open={deleteConfirmationModalActive}
        onClose={() => setDeleteConfirmationModalActive(false)}
        title="Delete Metafield"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDeleteMetafield,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteConfirmationModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <p>Are you sure you want to delete this metafield?</p>
        </Modal.Section>
      </Modal>
      <Modal
        open={successModalActive}
        onClose={() => setSuccessModalActive(false)}
        title="Success"
      >
        <Modal.Section>
          <p>Metafield changes saved successfully!</p>
        </Modal.Section>
      </Modal>
    </div>
  );
}

// CSS for the component
import "./metaview.css";

// Add this CSS to your "metaview.css" file

.meta-table-row {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ddd;
}

.meta-table-row div {
  flex: 1;
  padding: 5px;
}

.meta-table-header {
  background-color: #f4f6f8;
  font-weight: bold;
}

.metaaddition {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.metaaddition p {
  margin: 0;
}

.meta-button-group {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.delete-button {
  padding: 5px 10px;
  font-size: 14px;
  background-color: #d82c0d; /* Shopify red */
  color: #fff;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.delete-button:hover {
  background-color: #bf1e1e;
}
// import * as React from "react";
// import { useState } from "react";
// import { useLoaderData, Link , useNavigate } from "@remix-run/react";
// import "./css/metaview.css";
// import { json } from "@remix-run/node";
// import { Card, Select, Button, Modal } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";
// import backarrow from './assets/backarrowshop.png'
// // Loader function to fetch product and metafields data
// export const loader = async ({ params, request }) => {
//   console.log("params received in MetaView loader",params);
//   const { admin } = await authenticate.admin(request);
//   const productId = `gid://shopify/Product/${params.productId}`;

//   const metafieldsQuery = `
//     query getProductById {
//       product(id: "${productId}") {
//         id
//         title
//         metafields(first: 250) { 
//           edges {
//             node {
//               id
//               namespace
//               key
//               value
//               type
//             }
//           }
//         }
//       }
//     }`;

//   try {
//     const productResponse = await admin.graphql(metafieldsQuery);
//     const productData = await productResponse.json();

//     return json({
//       product: productData.data.product,
//       metafields: productData.data.product.metafields.edges,
//     });
//   } catch (error) {
//     console.error("Error fetching metafields:", error);
//     return json({
//       product: null,
//       metafields: [],
//     });
//   }
// };

// // Action function to update metafields
// export const action = async ({ request, params }) => {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();

//   const updatedMetafields = JSON.parse(formData.get("metafields"));
//   const productId = formData.get("productId");

//   const mutation = `
//   mutation {
//     productUpdate(
//       input: {
//         id: "${productId}",
//         metafields: ${JSON.stringify(updatedMetafields).replace(/"([^"]+)":/g, '$1:')}
//       }
//     ) {
//       userErrors {
//         field
//         message
//       }
//     }
//   }`;

//   try {
//     const response = await admin.graphql(mutation);
//     const responseData = await response.json();

//     if (responseData.errors || (responseData.data.productUpdate && responseData.data.productUpdate.userErrors.length > 0)) {
//       const errors = responseData.data.productUpdate.userErrors;
//       return json({ error: errors.map(err => err.message).join(", ") }, { status: 500 });
//     }

//     return json({ success: true });
//   } catch (error) {
//     console.error("Error saving metafields:", error);
//     return json({ error: "Error saving metafields" }, { status: 500 });
//   }
// };

// export default function Productmetaview() {
//   const data = useLoaderData();
//   const { product, metafields } = data;

//   const productId = product.id.split("/")[4];
//   console.log("Product ID from the productmetaview",productId);

//   const [showModal, setShowModal] = useState(false);
//   const [confirmationModalActive, setConfirmationModalActive] = useState(false); // State for the confirmation modal

//   const [editedFields, setEditedFields] = useState(
//     metafields.map((field) => ({
//       ...field.node,
//     }))
//   );

//   const [successModalActive, setSuccessModalActive] = useState(false);

//   const handleInputChange = (index, key, value) => {
//     const newFields = [...editedFields];
//     newFields[index][key] = value;
//     setEditedFields(newFields);
//   };

//   // Function to open the confirmation modal
//   const openConfirmationModal = () => {
//     setConfirmationModalActive(true);
//   };

//   // Function to handle confirmation of save action
//   const handleConfirmSave = async () => {
//     setConfirmationModalActive(false);
//     try {
//       const response = await fetch(`/app/Productmetaview/${product.id.split("/")[4]}`, {
//         method: "POST",
//         body: new URLSearchParams({
//           metafields: JSON.stringify(editedFields),
//           productId: product.id,
//         }),
//       });

//       if (response.ok) {
//         setSuccessModalActive(true);
//         setTimeout(() => {
//           setSuccessModalActive(false);
//         }, 3000);
//       } else {
//         const errorData = await response.json();
//         console.error("Error saving metafields:", errorData.error);
//       }
//     } catch (error) {
//       console.error("Failed to save metafields:", error.message);
//     }
//   };

//   // Function to discard the changes
//   const handleDiscard = () => {
//     setConfirmationModalActive(false);
//   };

//   // Options for the select dropdown
//   const typeOptions = [
//     { label: "Single Line Text", value: "single_line_text_field" },
//     { label: "Color", value: "color" },
//     { label: "Date", value: "date" },
//     { label: "Boolean", value: "boolean" },
//     { label: "Integer", value: "number_integer" },
//     { label: "Decimal", value: "number_decimal" },
//     { label: "Multi Line Text", value: "multi_line_text_field" },
//     { label: "Money", value: "money" },
//     { label: "Link", value: "link" },
//     { label: "JSON", value: "json" },
//     { label: "Dimension", value: "dimension" },
//     { label: "URL", value: "url" },
//   ];

//   const navigate = useNavigate();

//   const handleCreatemeta = () => {
//     console.log("Create MetaField is clicked",productId);
//     navigate(`/app/ProductMetafieldAdd/${productId}`);

//   }

//   return (
//     <div className="meta-container">
//       <Card padding="300">
//         {/* <div className="headviewtitle">
//           <img src={backarrow} alt="backarrow"/>
//           <h3 className="product-title">Update Metafields</h3>
//         </div> */}
//         <h4 className="product-title">{product ? product.title : "No product data available."}</h4>
//         <div className="metaaddition">
//           <p className="meta-count">Metafields: {metafields.length}</p>
//           <Button variant="primary" onClick={handleCreatemeta}>Create Metafield</Button>
//         </div>
//       </Card>
//       <div className="meta-table">
//         <div className="meta-header">
//           <div className="meta-cell-title">Type</div>
//           <div className="meta-cell-title">Namespace</div>
//           <div className="meta-cell-title">Key</div>
//           <div className="meta-cell-title">Value</div>
//         </div>

//         {editedFields && editedFields.length > 0 ? (
//           editedFields.map((field, index) => (
//             <div className="meta-row" key={field.id}>
//               <div className="meta-cell">
//                 <Select
//                   options={typeOptions}
//                   onChange={(value) => handleInputChange(index, "type", value)}
//                   value={field.type}
//                 />
//               </div>
//               <div className="meta-cell">
//                 <input
//                   type="text"
//                   value={field.namespace}
//                   readOnly
//                   style={{ backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}
//                 />
//               </div>
//               <div className="meta-cell">
//                 <input
//                   type="text"
//                   value={field.key}
//                   readOnly
//                   style={{ backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}
//                 />
//               </div>
//               <div className="meta-cell">
//                 <input
//                   type="text"
//                   value={field.value}
//                   onChange={(e) => handleInputChange(index, "value", e.target.value)}
//                 />
//               </div>
//             </div>
//           ))
//         ) : (
//           <div>No metafields available.</div>
//         )}
//       </div>
//       <div className="button-container" >
//         <Button className="submitbutton" onClick={openConfirmationModal} variant="primary">
//           Save Changes
//         </Button>
//       </div>

//       {/* Confirmation Modal */}
//       <Modal
//         open={confirmationModalActive}
//         onClose={() => setConfirmationModalActive(false)}
//         title="Confirm Changes"
//         primaryAction={{
//           content: "Save",
//           onAction: handleConfirmSave,
//         }}
//         secondaryActions={[
//           {
//             content: "Discard",
//             onAction: handleDiscard,
//           },
//         ]}
//       >
//         <Modal.Section>
//           <p>Do you want to save the changes you made to the metafields?</p>
//         </Modal.Section>
//       </Modal>

//       {/* Success Modal */}
//       <Modal
//         open={successModalActive}
//         onClose={() => setSuccessModalActive(false)}
//         title="Success"
//         primaryAction={{
//           content: "Close",
//           onAction: () => setSuccessModalActive(false),
//         }}
//       >
//         <Modal.Section>
//           <p>Metafields updated successfully!</p>
//         </Modal.Section>
//       </Modal>
//     </div>
//   );
// }
