import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, useNavigation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import Loader from './utils/loader.jsx'; // Import the loader component
import { useEffect, useState } from 'react';

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData();
  const navigation = useNavigation(); // Get the navigation state
  const [isLoading, setIsLoading] = useState(false);

  // Update loading state based on navigation status
  useEffect(() => {
    if (navigation.state === "loading") {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [navigation.state]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Home</Link>
        <Link to="/app/productdetails">Generate Metadata</Link>
        <Link to="/app/review">Review Metadata</Link>
        <Link to="/app/metafields">Manage Metadata</Link>
      </NavMenu>
      {/* Pass loading state to the Loader */}
      <Loader isOpen={isLoading} onClose={() => setIsLoading(false)} />
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
