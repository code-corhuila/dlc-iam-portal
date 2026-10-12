FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts
RUN npm run build:portal

FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10
ARG IAM_RELEASE=0.1.0-local
RUN printf '%s' "$IAM_RELEASE" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*$'
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/iam-portal-module/browser/ /tmp/iam/
RUN mkdir -p /usr/share/nginx/html/portals/iam \
    && mv /tmp/iam "/usr/share/nginx/html/portals/iam/$IAM_RELEASE"
