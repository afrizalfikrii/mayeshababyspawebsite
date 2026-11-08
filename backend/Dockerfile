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

# Configure PHP upload limits & 60s execution timeout (allows TiDB serverless 30s cold wakeup)
RUN printf "upload_max_filesize=10M\npost_max_size=10M\nmax_execution_time=60\nmemory_limit=256M\n" > /usr/local/etc/php/conf.d/zz-custom.ini

# Overwrite zz-docker.conf to use Unix socket (/run/php-fpm.sock) instead of TCP port 9000
# This ensures ONLY port 10000 (Nginx) is open in the container so Render's port scanner never gets confused
RUN rm -f /usr/local/etc/php-fpm.d/zz-render.conf \
    && printf "[global]\ndaemonize = no\nerror_log = /proc/self/fd/2\n\n[www]\nuser = www-data\ngroup = www-data\nlisten = /run/php-fpm.sock\nlisten.owner = www-data\nlisten.group = www-data\nlisten.mode = 0666\nclear_env = no\npm = dynamic\npm.max_children = 10\npm.start_servers = 3\npm.min_spare_servers = 2\npm.max_spare_servers = 5\npm.max_requests = 500\nrequest_terminate_timeout = 60s\ncatch_workers_output = yes\n" > /usr/local/etc/php-fpm.d/zz-docker.conf

# Configure Nginx
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Set permissions, link storage at build time, and validate Nginx config
RUN mkdir -p /run/nginx storage/logs storage/framework/cache/data storage/framework/sessions storage/framework/views bootstrap/cache \
    && php artisan storage:link --force \
    && chown -R www-data:www-data storage bootstrap/cache public \
    && chmod -R 775 storage bootstrap/cache \
    && nginx -t

ENV SESSION_DRIVER=file
ENV CACHE_STORE=file
EXPOSE 10000

# Fast startup: bind Nginx to $PORT, force file session/cache, start PHP-FPM & Nginx
CMD ["sh", "-c", "sed -i \"s/listen [0-9]*;/listen ${PORT:-10000};/g\" /etc/nginx/http.d/default.conf && SESSION_DRIVER=file CACHE_STORE=file php-fpm -D && exec nginx -g 'daemon off;'"]
