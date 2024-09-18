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
    // Fetch shop details
    const response = await admin.graphql(shopQuery);
    const shop = await response.json();
    console.log("Shop data:", shop);

    if (!shop.data || !shop.data.shop) {
      throw new Error('Shop data is missing');
    }

    const shopId = shop.data.shop.id;

    // Fetch request data
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
    return new Response(`Error fetching data: ${error.message}`, { status: 500 });
  }
};
