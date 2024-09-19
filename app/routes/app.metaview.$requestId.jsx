// app/routes/app.metaview.$requestId.jsx
import { useParams } from '@remix-run/react';
import { Page, Layout, Card } from '@shopify/polaris';

export const loader = async ({ params }) => {
  // Fetch data or handle logic for the particular request ID
  const requestId = params.requestId;
  return { requestId };
};

export default function MetaView() {
  const { requestId } = useParams();

  return (
    <Page title={`Request ID: ${requestId}`}>
      <Layout>
        <Layout.Section>
          <Card title="Request Details">
            <p>Details for Request ID: {requestId}</p>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
