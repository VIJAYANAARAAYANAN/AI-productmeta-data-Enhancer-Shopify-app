import React, { useState } from "react";
import { useParams } from "react-router-dom"; // Import useParams to get productId
import { Button, Select } from "@shopify/polaris";

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
// import * as React from "react";
// import { useState } from "react";
// import { useLoaderData, useNavigate } from "@remix-run/react";
// import { Card, Button, Select, Modal } from "@shopify/polaris";
// import { json } from "@remix-run/node";
// import { authenticate } from "../../shopify.server";

// // Loader function to get the product id
// export const loader = async ({ params, request }) => {
//   const { admin } = await authenticate.admin(request);
//   const productId = `gid://shopify/Product/${params.productId}`;

//   return json({ productId });
// };

// export default function ProductMetafieldAdd() {
//   const data = useLoaderData();
//   const { productId } = data;
//   console.log(productId);

//   // State for storing metafields array
//   const [metafields, setMetafields] = useState([
//     { type: "", namespace: "", key: "", value: "" }
//   ]);

//   // State for success modal visibility
//   const [successModalActive, setSuccessModalActive] = useState(false);
//   const navigate = useNavigate();

//   // Handle input change in the fields
//   const handleInputChange = (index, key, value) => {
//     const newMetafields = [...metafields];
//     newMetafields[index][key] = value;
//     setMetafields(newMetafields);
//   };

//   // Add a new metafield row
//   const handleAddField = () => {
//     setMetafields([
//       ...metafields,
//       { type: "", namespace: "", key: "", value: "" }
//     ]);
//   };

//   // Handle save button click
//   const handleSave = async () => {
//     // Dummy console log instead of the update logic
//     console.log("Metafields to be saved:", metafields);

//     // Uncomment and replace this with the actual mutation code later
//     /*
//     const mutation = `
//       mutation {
//         productUpdate(
//           input: {
//             id: "${productId}",
//             metafields: ${JSON.stringify(metafields).replace(/"([^"]+)":/g, '$1:')}
//           }
//         ) {
//           userErrors {
//             field
//             message
//           }
//         }
//       }`;
//     console.log(metafields);
//     try {
//       const response = await fetch(`/app/ProductMetafieldAdd/${productId}`, {
//         method: "POST",
//         body: JSON.stringify({ metafields }),
//         headers: {
//           "Content-Type": "application/json",
//         },
//       });

//       const responseData = await response.json();

//       if (responseData.errors || (responseData.data.productUpdate && responseData.data.productUpdate.userErrors.length > 0)) {
//         console.error("Error saving metafields:", responseData.data.productUpdate.userErrors);
//       } else {
//         setSuccessModalActive(true);
//         setTimeout(() => {
//           setSuccessModalActive(false);
//           navigate(`/app/Productmetaview/${productId.split('/').pop()}`); // Redirect back to the product view
//         }, 3000);
//       }
//     } catch (error) {
//       console.error("Failed to save metafields:", error.message);
//     }
//     */
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
//     { label: "URL", value: "url" }
//   ];

//   return (
//     <div className="meta-container">
//       <Card padding="300">
//         <h4 className="product-title">Add New Metafields</h4>
//       </Card>
//       <div className="meta-table">
//         <div className="meta-header">
//           <div className="meta-cell-title">Type</div>
//           <div className="meta-cell-title">Namespace</div>
//           <div className="meta-cell-title">Key</div>
//           <div className="meta-cell-title">Value</div>
//         </div>

//         {metafields.map((field, index) => (
//           <div className="meta-row" key={index}>
//             <div className="meta-cell">
//               <Select
//                 options={typeOptions}
//                 onChange={(value) => handleInputChange(index, "type", value)}
//                 value={field.type}
//               />
//             </div>
//             <div className="meta-cell">
//               <input
//                 type="text"
//                 value={field.namespace}
//                 onChange={(e) => handleInputChange(index, "namespace", e.target.value)}
//               />
//             </div>
//             <div className="meta-cell">
//               <input
//                 type="text"
//                 value={field.key}
//                 onChange={(e) => handleInputChange(index, "key", e.target.value)}
//               />
//             </div>
//             <div className="meta-cell">
//               <input
//                 type="text"
//                 value={field.value}
//                 onChange={(e) => handleInputChange(index, "value", e.target.value)}
//               />
//             </div>
//           </div>
//         ))}
//       </div>
//       <div className="button-container">
//         <Button onClick={handleAddField}>Add New Metafield</Button>
//         <Button onClick={handleSave}>Save Changes</Button>
//       </div>

//       {/* Success Modal */}
//       <Modal
//         open={successModalActive}
//         onClose={() => setSuccessModalActive(false)}
//         title="Success"
//         primaryAction={{
//           content: "Close",
//           onAction: () => setSuccessModalActive(false)
//         }}
//       >
//         <Modal.Section>
//           <p>Metafields added successfully!</p>
//         </Modal.Section>
//       </Modal>
//     </div>
//   );
// }
