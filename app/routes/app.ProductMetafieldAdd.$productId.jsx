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

  // Prepare the mutation string without skipping any fields
  const metafieldsString = metafields
    .map(
      ({ namespace, key, value, type }) => `
      {
        namespace: "${namespace}",
        key: "${key}",
        value: "${value}",
        type: "${type}"
      }
    `,
    )
    .join(", ");

  const mutation = `
   mutation UpdateProductMetafield {
  productUpdate(
    product: {
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
    const result = await admin.graphql(mutation);
    const resultData = await result.json();

    if (resultData.errors) {
      console.error("Mutation errors:", resultData.errors);
      return json({ success: false, message: "Failed to apply metafields" });
    }

    console.log(
      "This is the result data",
      resultData.data.productUpdate.product,
    );

    return json({
      success: true,
      message: "Metafields applied successfully!",
      result: resultData,
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
    newRows[index][key] = value;
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

    // Create a POST request to trigger the action function
    fetch(`/app/ProductMetafieldAdd/${productId}`, {
      method: "POST",
      body: formData,
    }).then((response) => {
      if (response.ok) {
        console.log("Metafields successfully updated!"); // Log success message
        setConfirmationModalActive(false);

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
            <div className="meta-cell-grid">
              <input
                type="text"
                value={row.value}
                onChange={(e) =>
                  handleInputChange(index, "value", e.target.value)
                }
                placeholder="Value"
              />
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
