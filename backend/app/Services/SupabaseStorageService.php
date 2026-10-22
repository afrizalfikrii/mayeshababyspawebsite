<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SupabaseStorageService
{
    protected string $url;
    protected string $key;
    protected string $bucket;

    public function __construct()
    {
        $this->url    = rtrim(config('services.supabase.url') ?? env('SUPABASE_URL', ''), '/');
        $this->key    = config('services.supabase.key') ?? env('SUPABASE_KEY', '');
        $this->bucket = config('services.supabase.bucket') ?? env('SUPABASE_BUCKET', 'payment-proofs');
    }

    /**
     * Check if Supabase storage credentials are configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->url) && !empty($this->key);
    }

    /**
     * Upload an uploaded file to Supabase Storage.
     * Returns the permanent public CDN URL on success, or null on failure.
     */
    public function upload(UploadedFile $file, string $folder = ''): ?string
    {
        if (!$this->isConfigured()) {
            Log::warning('SupabaseStorageService: credentials not configured. Skipping cloud upload.');
            return null;
        }

        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename  = Str::random(40) . '.' . $extension;
        $path      = $folder ? trim($folder, '/') . '/' . $filename : $filename;

        $mime = $file->getMimeType() ?: 'image/jpeg';

        try {
            $fileContents = file_get_contents($file->getRealPath());

            $response = Http::timeout(8)->withHeaders([
                'apikey'        => $this->key,
                'Authorization' => 'Bearer ' . $this->key,
                'Content-Type'  => $mime,
            ])->withBody($fileContents, $mime)
              ->post("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");

            if ($response->successful()) {
                return "{$this->url}/storage/v1/object/public/{$this->bucket}/{$path}";
            }

            Log::error('SupabaseStorageService upload failed', [
                'status'   => $response->status(),
                'response' => $response->body(),
            ]);

            return null;
        } catch (\Throwable $e) {
            Log::error('SupabaseStorageService upload exception', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Delete an object from Supabase Storage by its public URL or path.
     */
    public function delete(?string $urlOrPath): bool
    {
        if (!$urlOrPath || !$this->isConfigured()) {
            return false;
        }

        // Extract relative path within the bucket if a full public URL was provided
        $prefix = "{$this->url}/storage/v1/object/public/{$this->bucket}/";
        if (str_starts_with($urlOrPath, $prefix)) {
            $path = substr($urlOrPath, strlen($prefix));
        } else {
            $path = ltrim($urlOrPath, '/');
        }

        try {
            $response = Http::withHeaders([
                'apikey'        => $this->key,
                'Authorization' => 'Bearer ' . $this->key,
            ])->delete("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");

            return $response->successful();
        } catch (\Throwable $e) {
            Log::error('SupabaseStorageService delete exception', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
