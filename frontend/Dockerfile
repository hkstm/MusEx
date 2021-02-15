FROM node:14 as build

WORKDIR /app
ADD ./ /app
RUN yarn install
RUN yarn run build

FROM nginx:latest
EXPOSE 80
RUN mkdir /app
COPY --from=build /app/build/ /serve
COPY --from=build /app/nginx.conf /etc/nginx/nginx.conf
