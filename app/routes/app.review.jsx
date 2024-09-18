import * as React from 'react';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { Page, Layout, Card, DataTable, Button, Badge, Frame } from '@shopify/polaris';
import { authenticate } from "../shopify.server";

export const loader: LoaderFunction = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const shopQuery = `
    {
      shop {
        id
        name
        email
      }
    }
  `;

  try {
    const response = await admin.graphql(shopQuery);
    const shop = await response.json();

    const requestResponse = await fetch('https://cartesian-api.plotch.io/catalog/genrequest/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: shop.data.shop.id, 
      }),
    });

    const requestData = await requestResponse.json();
    console.log(requestData);
    if (requestData.api_action_status === 'success') {
      return json({
        shop: shop.data.shop,
        requestData: requestData.request_data,
      });
    }

    return new Response("Error fetching request data", { status: 500 });

  } catch (error) {
    console.error("Error fetching shop details or request data:", error);
    return new Response("Error fetching data", { status: 500 });
  }
};

export default function RequestTable() {
  const { shop, requestData } = useLoaderData();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (requestData.length === 0) {
      setIsLoading(true);
    }
  }, [requestData]);

  const handleDownload = (url) => {
    window.location.href = url;
  };

  const rows = requestData.map((request) => [
    request.request_id,
    <Badge status={request.request_status === 'COMPLETED' ? 'success' : 'attention'}>
      {request.request_status}
    </Badge>,
    request.request_date,
    request.num_products,
    <Button plain onClick={() => handleDownload(request.download_link)}>
      Download
    </Button>,
    <Button plain>
      <Link>
        View
      </Link>
    </Button>
  ]);

  return (
    <Frame>
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <Card>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['Request Id', 'Request Status', 'Request Date', 'Num Products', 'Sheet', 'Review']}
                rows={rows}
                loading={isLoading}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
