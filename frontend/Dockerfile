FROM nginx:alpine
WORKDIR /app
COPY . /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template
ENV PORT=8080
# render template to nginx config and start nginx
CMD ["sh", "-c", "envsubst '$$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
