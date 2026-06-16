FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm install
COPY . .
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm install --omit=dev
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "server"]
