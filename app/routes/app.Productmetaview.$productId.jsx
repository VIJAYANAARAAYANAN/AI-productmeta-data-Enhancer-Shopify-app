import * as React from "react";
import { useState } from "react";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import "./css/metaview.css";
import { json } from "@remix-run/node";
import { Card, Select, Button, Modal } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import backarrow from './assets/backarrowshop.png'; // This import is kept based on your earlier code.

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
  
  const actionType = formData.get("action");
  const productId = formData.get("productId");
  
  if (actionType === "update") {
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
  } else if (actionType === "delete") {
    const metafieldId = formData.get("metafieldId");

    const deleteMutation = `
      mutation metafieldDelete($input: MetafieldDeleteInput!) {
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
  }
};

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;

  const productId = product.id.split("/")[4];
  console.log("Product ID from the productmetaview", productId);

  const [showModal, setShowModal] = useState(false);
  const [confirmationModalActive, setConfirmationModalActive] = useState(false);
  const [successModalActive, setSuccessModalActive] = useState(false);
  const [editedFields, setEditedFields] = useState(
    metafields.map((field) => ({
      ...field.node,
    }))
  );

  const navigate = useNavigate();

  const handleCreatemeta = () => {
    console.log("Create MetaField is clicked", productId);
    navigate(`/app/ProductMetafieldAdd/${productId}`);
  }

  const handleInputChange = (index, key, value) => {
    const newFields = [...editedFields];
    newFields[index][key] = value;
    setEditedFields(newFields);
  };

  const openConfirmationModal = () => {
    setConfirmationModalActive(true);
  };

  const handleConfirmSave = async () => {
    setConfirmationModalActive(false);
    try {
      const response = await fetch(`/app/Productmetaview/${product.id.split("/")[4]}`, {
        method: "POST",
        body: new URLSearchParams({
          action: "update",
          metafields: JSON.stringify(editedFields),
          productId: product.id,
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

  // Function to handle deleting a metafield
  const handleDeleteMetafield = async (metafieldId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this metafield?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/app/Productmetaview/${product.id.split("/")[4]}`, {
        method: "POST",
        body: new URLSearchParams({
          action: "delete",
          metafieldId: metafieldId,
          productId: product.id,
        }),
      });

      if (response.ok) {
        // Remove the deleted metafield from the state
        setEditedFields(editedFields.filter(field => field.id !== metafieldId));
        setSuccessModalActive(true);
        setTimeout(() => {
          setSuccessModalActive(false);
        }, 3000);
      } else {
        const errorData = await response.json();
        console.error("Error deleting metafield:", errorData.error);
      }
    } catch (error) {
      console.error("Failed to delete metafield:", error.message);
    }
  };

  return (
    <div className="meta-container">
      <Card padding="300">
        <h4 className="product-title">{product ? product.title : "No product data available."}</h4>
        <div className="metaaddition">
          <p className="meta-count">Metafields: {metafields.length}</p>
          <Button variant="primary" onClick={handleCreatemeta}>Create Metafield</Button>
        </div>
      </Card>
      <div className="meta-table">
        <div className="meta-header">
          <div className="meta-cell-title">Type</div>
          <div className="meta-cell-title">Namespace</div>
          <div className="meta-cell-title">Key</div>
          <div className="meta-cell-title">Value</div>
          <div className="meta-cell-title">Actions</div> {/* New header for actions */}
        </div>

        {editedFields && editedFields.length > 0 ? (
          editedFields.map((field, index) => (
            <div className="meta-row" key={field.id}>
              <div className="meta-cell">
                <Select
                  options={[
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
                  ]}
                  onChange={(value) => handleInputChange(index, "type", value)}
                  value={field.type}
                />
              </div>
              <div className="meta-cell">
                <input
                  type="text"
                  value={field.namespace}
                  readOnly
                  style={{ backgroundColor: '#f0f0f0', border: 'none' }}
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
              <div className="meta-cell">
                <Button variant="danger" onClick={() => handleDeleteMetafield(field.id)}>Delete</Button>
              </div>
            </div>
          ))
        ) : (
          <p>No metafields available</p>
        )}
      </div>
      <div className="buttons">
        <Button primary onClick={openConfirmationModal}>Save</Button>
        <Link to="/app/Producttable" className="back-button">
          <Button plain>
            <img src={backarrow} alt="Back" />
            Back
          </Button>
        </Link>
      </div>

      {confirmationModalActive && (
        <Modal
          open={confirmationModalActive}
          onClose={() => setConfirmationModalActive(false)}
          title="Confirm Save"
          primaryAction={{
            content: "Confirm",
            onAction: handleConfirmSave,
          }}
          secondaryAction={{
            content: "Cancel",
            onAction: () => setConfirmationModalActive(false),
          }}
        >
          <Modal.Section>
            <p>Are you sure you want to save the changes to these metafields?</p>
          </Modal.Section>
        </Modal>
      )}

      {successModalActive && (
        <Modal
          open={successModalActive}
          onClose={() => setSuccessModalActive(false)}
          title="Success"
        >
          <Modal.Section>
            <p>Metafields updated successfully!</p>
          </Modal.Section>
        </Modal>
      )}
    </div>
  );
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
