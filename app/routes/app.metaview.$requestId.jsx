import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

export const loader = async ({ params }) => {
  const { requestId } = params;

  return json({ id: requestId });
};

export default function MetaView() {
  const requestDetails = useLoaderData();

  return (
    <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px", maxWidth: "400px", margin: "auto" }}>
      <h2>Request ID</h2>
      <p><strong>{requestDetails.id}</strong></p>
    </div>
  );
}
