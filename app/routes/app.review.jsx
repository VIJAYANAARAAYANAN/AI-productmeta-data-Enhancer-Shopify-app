import * as React from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { Page, Layout, Card, DataTable, Button, Badge, Frame } from '@shopify/polaris';
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
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
    console.log("Shop data:", shop);

    if (!shop.data || !shop.data.shop) {
      throw new Error('Shop data is missing');
    }

    const shopId = shop.data.shop.id;

    const requestResponse = await fetch('https://cartesian-api.plotch.io/catalog/genrequest/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: shopId,
      }),
    });

    if (!requestResponse.ok) {
      const errorText = await requestResponse.text();
      throw new Error(`Request failed with status ${requestResponse.status}: ${errorText}`);
    }

    const requestData = await requestResponse.json();
    console.log("Request data:", requestData);

    if (requestData.api_action_status === 'success') {
      return json({
        shop: shop.data.shop,
        requestData: requestData.request_data || [],
      });
    }

    throw new Error("Error fetching request data");

  } catch (error) {
    console.error("Error fetching shop details or request data:", error);

    return json({
      shop: {
        id: 'not available',
        name: 'not available',
        email: 'not available',
      },
      requestData: [
        {
          request_id: 'not available',
          request_status: 'not available',
          request_date: 'not available',
          num_products: 'not available',
          download_link: 'not available',
        },
      ],
    });
  }
};

export default function RequestTable() {
  const { shop, requestData } = useLoaderData();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!requestData || requestData.length === 0) {
      setIsLoading(true);
    }
  }, [requestData]);

  const handleDownload = (url) => {
    window.location.href = url;
  };

  const rows = (requestData || []).map((request) => [
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
      <Link to={`/metaview/${request.request_id}`}>
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
