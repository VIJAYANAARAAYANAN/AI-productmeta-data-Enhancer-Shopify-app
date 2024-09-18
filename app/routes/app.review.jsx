import * as React from 'react';
import { Page, Layout, Card, DataTable, Button, Badge, Frame, Link } from '@shopify/polaris';

export default function RequestTable() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [requestData, setRequestData] = React.useState([]);

  // Mock API call to get request data
  React.useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const apiResponse = [
        {
          requestId: '6249020310',
          requestStatus: 'COMPLETED',
          requestDate: '31/08/2024',
          numProducts: 1,
          sheetUrl: '#',
        },
      ];

      setRequestData(apiResponse);
      setIsLoading(false);
    }, 2000);
  }, []);

  const handleDownload = (url) => {
    window.location.href = url; 
  };

  const handleReview = (requestId) => {
    console.log('Review button clicked for Request ID:', requestId);
  };

  const rows = requestData.map((request) => [
    request.requestId,
    <Badge status={request.requestStatus === 'COMPLETED' ? 'success' : 'attention'}>
      {request.requestStatus}
    </Badge>,
    request.requestDate,
    request.numProducts,
    <Button plain onClick={() => handleDownload(request.sheetUrl)}>
      Download
    </Button>,
    <Button onClick={handleReview} >
      <Link to={`/metaview/${request.requestId}`}>
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
