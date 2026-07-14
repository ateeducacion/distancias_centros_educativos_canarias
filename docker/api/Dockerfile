FROM composer:2.8 AS vendor
WORKDIR /app
COPY packages/php /packages/php
COPY api/composer.json ./composer.json
RUN composer install --no-dev --classmap-authoritative
FROM php:8.3-fpm-alpine3.20
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=vendor /app/vendor ./vendor
COPY api/public ./public
USER app
EXPOSE 9000
CMD ["php-fpm","-F"]
