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

// Loader function to fetch product and metafields data
export const loader = async ({ params, request }) => {
  try {
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

    const productResponse = await admin.graphql(metafieldsQuery);
    const productData = await productResponse.json();

    return json({
      product: productData.data.product,
      metafields: productData.data.product.metafields.edges,
      admin, // Pass the admin object along
    });
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return json({
      product: null,
      metafields: [],
      error: error,
      admin: null, // Handle case when admin is null
    });
  }
};

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields, admin, error} = data;

  console.log(product);
  console.log(metafields);
  console.log(error);
  
  const [editedFields, setEditedFields] = useState(
    metafields.map((field) => ({
      ...field.node,
    }))
  );

  // Handle input changes for editable metafields
  const handleInputChange = (index, key, value) => {
    const newFields = [...editedFields];
    newFields[index][key] = value;
    setEditedFields(newFields);
  };

  // Handle saving of edited metafields
  const handleSave = async () => {
    if (!product || !product.id) {
      console.error("Product ID is missing.");
      return;
    }

    try {
      // Check if admin is available
      if (!admin) {
        throw new Error("Admin authentication is not available.");
      }

      // Construct the metafields array for the mutation input
      const updatedMetafields = editedFields.map((field) => ({
        id: field.id,
        value: field.value,
      }));

      // Create the mutation query string
      const updateQuery = `
        mutation {
          productUpdate(
            input: {
              id: "${product.id}",
              metafields: ${JSON.stringify(updatedMetafields).replace(/"([^"]+)":/g, '$1:')}
            }
          ) {
            product {
              id
              metafields(first: 10) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      // Execute the mutation using the admin graphql API
      const response = await admin.graphql(updateQuery);
      const result = await response.json();

      // Check for user errors in the response
      if (result.errors || (result.data.productUpdate && result.data.productUpdate.userErrors.length > 0)) {
        throw new Error(result.errors || result.data.productUpdate.userErrors.map(err => err.message).join(", "));
      }

      console.log("Metafields updated successfully:", result);
      console.log("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error.message || error);
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
      <Button className="submitbutton" onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
}
// import * as React from "react";
// import { useState, useEffect } from "react";
// import { useLoaderData } from "@remix-run/react";
// import "./css/metaview.css";
// import { json } from "@remix-run/node";
// import { Card, Select, Button, Modal } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";

// export const loader = async ({ params, request }) => {
//   const { admin } = await authenticate.admin(request);
//   const productId = `gid://shopify/Product/${params.productId}`;
//   console.log("Product ID in loader function", productId);
  
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
//     console.log("ProductID IN LOADER", productData);
    
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

// export const action = async ({ request, params }) => {
//   const { admin } = await authenticate.admin(request);
//   console.log(params);
//   const formData = await request.formData();

//   // Parse the metafields from formData
//   const updatedMetafieldsString = formData.get("metafields");
//   const updatedMetafields = JSON.parse(updatedMetafieldsString);

//   console.log(updatedMetafields);
  
//   // Access productId from formData if you want to use it here
//   const productId = formData.get("productId");
//   console.log("This is the product Id in the action", productId);

//   // Prepare the metafield objects for the mutation
//   const metafieldInput = updatedMetafields.map((field) => ({
//     id: field.id,
//     value: field.value,
//     type: field.type,
//   }));
//   console.log("MetaField Input on mutation", metafieldInput);

//   // Construct the mutation using the updated metafields
//   const mutation = `
//   mutation {
//     productUpdate(
//       input: {
//         id: "${productId}",
//         metafields: [
//           ${metafieldInput
//             .map(
//               (field) => `
//             {
//               id: "${field.id}",
//               value: "${field.value}",
//               type: "${field.type}"
//             }
//           `,
//             )
//             .join(",")}
//         ]
//       }
//     ) {
//       userErrors {
//         field
//         message
//       }
//     }
//   }
// `;

//   try {
//     const response = await admin.graphql(mutation);

//     const responseData = await response.json();

//     if (responseData.data.productUpdate.userErrors.length > 0) {
//       const errors = responseData.data.productUpdate.userErrors;
//       console.error("User errors:", errors);
//       return json(
//         { error: "Error saving metafields", details: errors },
//         { status: 500 },
//       );
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
//   console.log("Product id from Loader in MAIN", product.id);
  
//   const [editedFields, setEditedFields] = useState(
//     metafields.map((field) => ({
//       ...field.node,
//     })),
//   );

//   // State to store productId
//   const [productId, setProductId] = useState(product.id);
//   const [showModal, setShowModal] = useState(false);
//   const [isModified, setIsModified] = useState(false);

//   // Update productId when product changes
//   useEffect(() => {
//     if (product) {
//       setProductId(product.id);
//     }
//   }, [product]);

//   const handleInputChange = (index, key, value) => {
//     const newFields = [...editedFields];
//     newFields[index][key] = value;
//     setEditedFields(newFields);
//     setIsModified(true); // Mark as modified
//   };

//   const handleSave = () => {
//     setShowModal(true); // Show confirmation modal
//   };

//   const confirmSave = async () => {
//     console.log("Entering the confirms save function with ", productId);
//     const response = await fetch(
//       `/app/Productmetaview/${productId.split("/")[4]}`,
//       {
//         method: "POST",
//         body: new URLSearchParams({
//           metafields: JSON.stringify(editedFields),
//           productId, // Send productId in the request
//         }),
//       },
//     );
//     console.log("From ConfirmSave function", response);
    
//     if (response.ok) {
//       window.location.reload(); // Reload to reflect changes
//     } else {
//       console.error("Failed to save metafields");
//     }
//   };

//   const handleModalClose = () => {
//     setShowModal(false); // Close confirmation modal
//   };

//   return (
//     <div className="meta-container">
//       <Card padding="300">
//         <h4 className="product-title">
//           {product ? product.title : "No product data available."}
//         </h4>
//         <div className="meta-count">
//           <p>Metafields: {metafields.length}</p>
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
//                   options={[
//                     { label: "Single Line Text", value: "single_line_text_field" },
//                     { label: "Color", value: "color" },
//                     { label: "Date", value: "date" },
//                     { label: "Boolean", value: "boolean" },
//                     { label: "Integer", value: "number_integer" },
//                     { label: "Decimal", value: "number_decimal" },
//                     { label: "Multi Line Text", value: "multi_line_text_field" },
//                     { label: "Money", value: "money" },
//                     { label: "Link", value: "link" },
//                     { label: "JSON", value: "json" },
//                     { label: "Dimension", value: "dimension" },
//                     { label: "URL", value: "url" },
//                   ]}
//                   onChange={(value) => handleInputChange(index, "type", value)}
//                   value={field.type}
//                 />
//               </div>
//               <div className="meta-cell">
//                 <input
//                   type="text"
//                   value={field.namespace}
//                   onChange={(e) =>
//                     handleInputChange(index, "namespace", e.target.value)
//                   }
//                 />
//               </div>
//               <div className="meta-cell">
//                 <input
//                   type="text"
//                   value={field.key}
//                   onChange={(e) =>
//                     handleInputChange(index, "key", e.target.value)
//                   }
//                 />
//               </div>
//               <div className="meta-cell">
//                 <input
//                   type="text"
//                   value={field.value}
//                   onChange={(e) =>
//                     handleInputChange(index, "value", e.target.value)
//                   }
//                 />
//               </div>
//             </div>
//           ))
//         ) : (
//           <div>No metafields available.</div>
//         )}
//       </div>
//       <Button
//         className="submitbutton"
//         onClick={handleSave}
//       >
//         Save Changes
//       </Button>

//       {/* Confirmation Modal */}
//       <Modal
//         open={showModal}
//         onClose={handleModalClose}
//         title="Confirm Save Changes"
//         primaryAction={{
//           content: "Save",
//           onAction: confirmSave,
//         }}
//         secondaryActions={[
//           {
//             content: "Discard",
//             onAction: handleModalClose,
//           },
//         ]}
//       >
//         <Modal.Section>
//           <p>Do you want to save the changes you made to the metafields?</p>
//         </Modal.Section>
//       </Modal>
//     </div>
//   );
// }
