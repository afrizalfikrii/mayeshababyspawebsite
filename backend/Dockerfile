FROM php:8.2-fpm-alpine

# Install system dependencies & Nginx
RUN apk add --no-cache \
    nginx \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    oniguruma-dev \
    ca-certificates

# Install required PHP extensions for Laravel & TiDB
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        opcache

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application code
COPY . .

# Install dependencies (production)
RUN composer install --no-dev --prefer-dist --optimize-autoloader

# Configure PHP upload limits & timeouts
RUN printf "upload_max_filesize=10M\npost_max_size=10M\nmax_execution_time=30\nmemory_limit=256M\n" > /usr/local/etc/php/conf.d/zz-custom.ini

# Configure PHP-FPM worker pool (keep env vars from Render, auto-manage up to 10 workers, 30s timeout)
RUN printf "[www]\nuser = www-data\ngroup = www-data\nlisten = 127.0.0.1:9000\nclear_env = no\npm = dynamic\npm.max_children = 10\npm.start_servers = 3\npm.min_spare_servers = 2\npm.max_spare_servers = 5\npm.max_requests = 500\nrequest_terminate_timeout = 30s\ncatch_workers_output = yes\n" > /usr/local/etc/php-fpm.d/zz-render.conf

# Configure Nginx
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Set permissions for PHP-FPM (www-data) and validate Nginx config
RUN mkdir -p /run/nginx storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache public \
    && chmod -R 775 storage bootstrap/cache \
    && nginx -t

EXPOSE 8000

# Bind Nginx to Render's $PORT, link storage, start PHP-FPM & Nginx in foreground
CMD ["sh", "-c", "sed -i \"s/listen 8000;/listen ${PORT:-8000};/g\" /etc/nginx/http.d/default.conf && php artisan storage:link --force && php artisan config:clear && chown -R www-data:www-data storage bootstrap/cache && php-fpm -D && exec nginx -g 'daemon off;'"]
