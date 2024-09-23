// utils/shopifyApi.js
import { authenticate } from '../shopify.server';

// Function to get all products with their metafields using Shopify Admin API
export async function getAllProductsWithMetafields(request) {
  const { admin } = await authenticate.admin(request);
  
  const productsQuery = `
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            status
            images(first: 1) {
              edges {
                node {
                  src
                }
              }
            }
            metafields(first: 100) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
          }
        }
      }
    }
  `;
  
  try {
    const response = await admin.graphql(productsQuery);
    const data = await response.json();
    
    const products = data.data.products.edges.map((edge) => {
      const product = edge.node;
      const metafieldCount = product.metafields.edges.length;
      
      return {
        id: product.id,
        title: product.title,
        status: product.status,
        image: product.images.edges.length > 0 ? product.images.edges[0].node.src : 'default-image.png',
        metafieldCount: metafieldCount,
      };
    });
    
    return products;
  } catch (error) {
    console.error("Error fetching products and metafields:", error);
    throw new Error('Failed to fetch products with metafields');
  }
}
