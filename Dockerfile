# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install Shopify CLI globally
RUN npm install -g @shopify/cli@latest

# Set working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's code
COPY . .

# Run Prisma generate to initialize Prisma client files
RUN npx prisma generate

# Run Prisma migration to create necessary tables
RUN npx prisma migrate deploy

# Expose the port your app will run on (for example, 3000)
EXPOSE 3000

# Define environment variables
ENV SHOPIFY_API_KEY="194a5c6bd1568aafe7c4edd70301f8fb"
ENV SHOPIFY_API_SECRET="7db8af37b729fddbe40e7bce1b5263d2"
ENV SCOPES="read_content,read_metaobject_definitions,read_metaobjects,read_products,write_content,write_metaobject_definitions,write_metaobjects,write_products"
ENV SHOPIFY_APP_URL="https://cartesian-erp.plotch.io"
ENV SHOPIFY_METAFIELDS_ID="6fcf4ae3-914d-4300-a10b-d7a0ad8ef3d4"
ENV NODE_ENV=production

# Build the Remix app
RUN npm run build

# Start the Remix app
CMD ["npm", "start"]
