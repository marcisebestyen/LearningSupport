# STAGE 1: Build the Angular app
FROM node:20 AS build
WORKDIR /app
# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install
# Copy the rest of the code and build the project
COPY . .
RUN npm run build --configuration=production

# STAGE 2: Serve the app with Nginx
FROM nginx:alpine
# Copy the compiled files from the build stage to Nginx
# IMPORTANT: Change 'your-angular-app-name' to the actual name in your angular.json!
COPY --from=build /app/dist/frontend /usr/share/nginx/html
# Expose port 80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
