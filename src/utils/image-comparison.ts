// frontend/src/utils/image-comparison.ts
import pixelmatch from 'pixelmatch';
import { extractDriveFileId, isDriveUrl } from '@/components/ui/MediaRenderer';

export interface ImageComparisonResult {
  isDuplicate: boolean;
  similarity: number;
  pixelDifference: number;
  totalPixels: number;
  error?: string;
}

export interface ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Normalize image URL using the same logic as MediaRenderer
 */
export function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';

  // If it's a Google Drive URL, normalize it to the lh3 format
  if (isDriveUrl(url)) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return url;
}

/**
 * Fetch image from URL and convert to ImageBitmap
 */
async function fetchImageAsBitmap(url: string): Promise<ImageBitmap> {
  const normalizedUrl = normalizeImageUrl(url);

  try {
    const response = await fetch(normalizedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DuplicateDetection/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const blob = await response.blob();
    return await createImageBitmap(blob);
  } catch (error: any) {
    throw new Error(`Failed to fetch image ${normalizedUrl}: ${error.message}`);
  }
}

/**
 * Convert ImageBitmap to ImageData for pixel comparison
 */
function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  // Create a canvas to extract pixel data
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw the bitmap to canvas
  ctx.drawImage(bitmap, 0, 0);

  // Get the image data
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

  return {
    width: bitmap.width,
    height: bitmap.height,
    data: imageData.data
  };
}

/**
 * Resize images to the same dimensions for comparison
 */
function resizeImageData(imageData: ImageData, targetWidth: number, targetHeight: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Create a temporary canvas with original image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d')!;

  const tempImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  tempCtx.putImageData(tempImageData, 0, 0);

  // Draw resized image
  ctx.drawImage(tempCanvas, 0, 0, imageData.width, imageData.height, 0, 0, targetWidth, targetHeight);

  const resizedImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

  return {
    width: targetWidth,
    height: targetHeight,
    data: resizedImageData.data
  };
}

/**
 * Compare two images using pixel-level comparison with Pixelmatch
 */
export async function compareImages(
  url1: string,
  url2: string,
  options: {
    threshold?: number; // Pixel difference threshold (0-1)
    resizeToSameSize?: boolean;
    maxDimension?: number; // Maximum dimension for resized images
  } = {}
): Promise<ImageComparisonResult> {
  const {
    threshold = 0.1,
    resizeToSameSize = true,
    maxDimension = 512
  } = options;

  try {
    // Fetch both images
    const [bitmap1, bitmap2] = await Promise.all([
      fetchImageAsBitmap(url1),
      fetchImageAsBitmap(url2)
    ]);

    // Convert to ImageData
    let imageData1 = bitmapToImageData(bitmap1);
    let imageData2 = bitmapToImageData(bitmap2);

    // Resize images if requested and dimensions differ
    if (resizeToSameSize && (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height)) {
      // Calculate target dimensions maintaining aspect ratio
      const aspectRatio1 = imageData1.width / imageData1.height;
      const aspectRatio2 = imageData2.width / imageData2.height;

      // Use the smaller aspect ratio as base for consistent comparison
      const baseAspectRatio = Math.min(aspectRatio1, aspectRatio2);

      let targetWidth = Math.min(imageData1.width, imageData2.width, maxDimension);
      let targetHeight = Math.round(targetWidth / baseAspectRatio);

      // Ensure height doesn't exceed max dimension
      if (targetHeight > maxDimension) {
        targetHeight = maxDimension;
        targetWidth = Math.round(targetHeight * baseAspectRatio);
      }

      // Resize both images to the same dimensions
      imageData1 = resizeImageData(imageData1, targetWidth, targetHeight);
      imageData2 = resizeImageData(imageData2, targetWidth, targetHeight);
    }

    // Ensure images have the same dimensions for comparison
    if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
      return {
        isDuplicate: false,
        similarity: 0,
        pixelDifference: Math.abs(imageData1.width * imageData1.height - imageData2.width * imageData2.height),
        totalPixels: Math.max(imageData1.width * imageData1.height, imageData2.width * imageData2.height),
        error: 'Images have different dimensions and could not be resized for comparison'
      };
    }

    const { width, height } = imageData1;
    const totalPixels = width * height;

    // Create diff array
    const diff = new Uint8ClampedArray(imageData1.data.length);

    // Compare images using pixelmatch
    const pixelDifference = pixelmatch(
      imageData1.data,
      imageData2.data,
      diff,
      width,
      height,
      { threshold }
    );

    // Calculate similarity percentage
    const similarity = ((totalPixels - pixelDifference) / totalPixels) * 100;

    // Consider images as duplicates if similarity is above 95%
    const isDuplicate = similarity >= 95;

    return {
      isDuplicate,
      similarity,
      pixelDifference,
      totalPixels
    };

  } catch (error: any) {
    return {
      isDuplicate: false,
      similarity: 0,
      pixelDifference: 0,
      totalPixels: 0,
      error: error.message
    };
  }
}

/**
 * Batch compare multiple image pairs
 */
export async function batchCompareImages(
  imagePairs: Array<{ url1: string; url2: string; id: string }>,
  options: {
    threshold?: number;
    resizeToSameSize?: boolean;
    maxDimension?: number;
    concurrency?: number;
  } = {}
): Promise<Map<string, ImageComparisonResult>> {
  const { concurrency = 3 } = options;
  const results = new Map<string, ImageComparisonResult>();

  console.log(`🔄 Comparing ${imagePairs.length} first image pairs with concurrency ${concurrency}...`);

  // Process in batches to control concurrency
  for (let i = 0; i < imagePairs.length; i += concurrency) {
    const batch = imagePairs.slice(i, i + concurrency);

    const batchPromises = batch.map(async (pair) => {
      const result = await compareImages(pair.url1, pair.url2, options);
      results.set(pair.id, result);

      if (results.size % 10 === 0) {
        console.log(`📊 Compared ${results.size}/${imagePairs.length} first image pairs`);
      }
    });

    await Promise.all(batchPromises);
  }

  console.log(`✅ Completed comparing ${results.size} first image pairs`);
  return results;
}

/**
 * Quick hash-based comparison (faster but less accurate)
 */
export async function quickImageHash(url: string): Promise<string> {
  try {
    const bitmap = await fetchImageAsBitmap(url);
    const imageData = bitmapToImageData(bitmap);

    // Simple hash based on a few pixels (for quick comparison)
    const pixels = imageData.data;
    let hash = '';

    // Sample pixels at regular intervals
    const step = Math.max(1, Math.floor(Math.sqrt(pixels.length / 64))); // Sample ~64 pixels

    for (let i = 0; i < pixels.length; i += step * 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const brightness = Math.round((r + g + b) / 3);
      hash += brightness.toString(16).padStart(2, '0');
    }

    return hash;
  } catch (error) {
    console.warn(`Failed to create quick hash for ${url}:`, error);
    return '';
  }
}

/**
 * Validate if URL is accessible and returns an image
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const normalizedUrl = normalizeImageUrl(url);
    const response = await fetch(normalizedUrl, {
      method: 'HEAD', // HEAD request is faster for validation
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DuplicateDetection/1.0)',
      },
    });

    if (!response.ok) return false;

    const contentType = response.headers.get('content-type');
    return contentType ? contentType.startsWith('image/') : false;
  } catch (error) {
    return false;
  }
}
