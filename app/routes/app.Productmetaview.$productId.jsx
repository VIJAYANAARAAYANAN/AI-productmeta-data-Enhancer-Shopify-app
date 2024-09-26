import * as React from "react";
import { useState, useEffect } from "react";
import { useLoaderData } from "@remix-run/react";
import "./css/metaview.css";
import { json } from "@remix-run/node";
import { Card, Select, Button, Modal } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ params, request }) => {
  const { admin } = await authenticate.admin(request);
  const productId = gid://shopify/Product/${params.productId};
  console.log("Product ID in loader function", productId);
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
    console.log("ProductID IN LOADER", productData);
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
  console.log(params);
  const formData = await request.formData();

  // Parse the metafields from formData
  const updatedMetafieldsString = formData.get("metafields");
  const updatedMetafields = JSON.parse(updatedMetafieldsString);

  console.log(updatedMetafields);
  // Access productId from formData if you want to use it here
  const productId = formData.get("productId");
  console.log("This is the product Id in the action", productId);

  // Prepare the metafield objects for the mutation
  const metafieldInput = updatedMetafields.map((field) => ({
    // ownerId: productId, // Use the ownerId of the product
    id: field.id,
    // namespace: field.namespace,
    // key: field.key,
    value: field.value,
    type: field.type,
  }));
  console.log("MetaField Input on mutation", metafieldInput);

  // Construct the mutation using the updated metafields
  const mutation = `
  mutation {
    productUpdate(
      input: {
        id: "${productId}",
        metafields: [
          ${metafieldInput
            .map(
              (field) => `
            {
              id: "${field.id}",
              value: "${field.value}",
              type: "${field.type}"
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
    const response = await admin.graphql({
      query: mutation,
      variables: {
        metafields: metafieldInput,
      },
    });

    const responseData = await response.json();

    if (responseData.data.metafieldsSet.userErrors.length > 0) {
      const errors = responseData.data.metafieldsSet.userErrors;
      console.error("User errors:", errors);
      return json(
        { error: "Error saving metafields", details: errors },
        { status: 500 },
      );
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error saving metafields:", error);
    return json({ error: "Error saving metafields" }, { status: 500 });
  }
};

export default function Productmetaview() {
  const data = useLoaderData();
  const { product, metafields } = data;
  console.log("Product id from Loader in MAIN", product.id);
  const [editedFields, setEditedFields] = useState(
    metafields.map((field) => ({
      ...field.node,
    })),
  );

  // State to store productId
  const [productId, setProductId] = useState(product.id);

  const [showModal, setShowModal] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // Update productId when product changes
  useEffect(() => {
    if (product) {
      setProductId(product.id);
    }
  }, [product]);

  const handleInputChange = (index, key, value) => {
    const newFields = [...editedFields];
    newFields[index][key] = value;
    setEditedFields(newFields);
    setIsModified(true); // Mark as modified
  };

  const handleSave = () => {
    setShowModal(true); // Show confirmation modal
  };

  const confirmSave = async () => {
    console.log("Entering the confirms save function with ", productId);
    const response = await fetch(
      /app/Productmetaview/${productId.split("/")[4]},
      {
        method: "POST",
        body: new URLSearchParams({
          metafields: JSON.stringify(editedFields),
          productId, // Send productId in the request
        }),
      },
    );
    console.log("From ConfirmSave function", response);
    if (response.ok) {
      window.location.reload(); // Reload to reflect changes
    } else {
      console.error("Failed to save metafields");
    }
  };

  const handleModalClose = () => {
    setShowModal(false); // Close confirmation modal
  };

  return (
    <div className="meta-container">
      <Card padding="300">
        <h4 className="product-title">
          {product ? product.title : "No product data available."}
        </h4>
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
            <div className="meta-row" key={field.id}>
              <div className="meta-cell">
                <Select
                  options={[
                    {
                      label: "Single Line Text",
                      value: "single_line_text_field",
                    },
                    { label: "Color", value: "color" },
                    { label: "Date", value: "date" },
                    { label: "Boolean", value: "boolean" },
                    { label: "Integer", value: "number_integer" },
                    { label: "Decimal", value: "number_decimal" },
                    {
                      label: "Multi Line Text",
                      value: "multi_line_text_field",
                    },
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
      <Button
        className="submitbutton"
        onClick={() => {
          console.log("Button clicked");
          handleSave();
        }}
      >
        Save Changes
      </Button>

      {/* Confirmation Modal */}
      <Modal
        open={showModal}
        onClose={handleModalClose}
        title="Confirm Save Changes"
        primaryAction={{
          content: "Save",
          onAction: confirmSave,
        }}
        secondaryActions={[
          {
            content: "Discard",
            onAction: handleModalClose,
          },
        ]}
      >
        <Modal.Section>
          <p>Do you want to save the changes you made to the metafields?</p>
        </Modal.Section>
      </Modal>
    </div>
  );
}
