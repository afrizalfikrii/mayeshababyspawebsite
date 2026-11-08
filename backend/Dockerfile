FROM php:8.2-cli-alpine

# Install system dependencies
RUN apk add --no-cache \
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
        zip

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application code
COPY . .

# Set permissions
RUN chmod -R 775 storage bootstrap/cache

# Install dependencies (production)
RUN composer install --no-dev --prefer-dist --optimize-autoloader

ENV PHP_CLI_SERVER_WORKERS=4
EXPOSE 8000

# Start server directly using PHP built-in server (bypasses artisan serve log parser crash)
CMD ["sh", "-c", "php -v && php artisan storage:link --force && php artisan config:clear && exec php -S 0.0.0.0:${PORT:-8000} -t public"]
