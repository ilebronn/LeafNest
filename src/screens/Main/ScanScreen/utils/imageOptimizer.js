import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy'; // Use legacy API for compatibility
import {
  IMAGE_MAX_WIDTH,
  IMAGE_QUALITY,
  IMAGE_FORMAT
} from './constants';

/**
 * Optimize image for API upload
 * Resizes and compresses the image to reduce upload size and processing time
 * 
 * @param {string} uri - Image URI from camera or gallery
 * @param {Object} options - Optimization options
 * @param {number} options.maxWidth - Maximum width in pixels (default: IMAGE_MAX_WIDTH)
 * @param {number} options.quality - JPEG quality 0-1 (default: IMAGE_QUALITY)
 * @param {string} options.format - Image format (default: IMAGE_FORMAT)
 * @returns {Promise<Object>} - { uri, width, height, base64 }
 */
export const optimizeImage = async (uri, options = {}) => {
  if (!uri) {
    throw new Error('Image URI is required');
  }

  const {
    maxWidth = IMAGE_MAX_WIDTH,
    quality = IMAGE_QUALITY,
    format = IMAGE_FORMAT
  } = options;

  try {
    console.log('🖼️ Optimizing image...');
    const startTime = Date.now();

    // Get original image info
    const imageInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = imageInfo.size || 0;

    // Resize and compress
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }], // Maintains aspect ratio
      {
        compress: quality,
        format: format === 'jpeg' 
          ? ImageManipulator.SaveFormat.JPEG 
          : ImageManipulator.SaveFormat.PNG,
        base64: true
      }
    );

    const optimizedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
    const optimizedSize = optimizedInfo.size || 0;
    const compressionRatio = originalSize > 0 
      ? ((1 - optimizedSize / originalSize) * 100).toFixed(1) 
      : 0;

    const processingTime = Date.now() - startTime;

    console.log(`✅ Image optimized in ${processingTime}ms`);
    console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);
    console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(1)}KB`);
    console.log(`   Compression: ${compressionRatio}%`);

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      base64: manipulatedImage.base64,
      originalSize,
      optimizedSize,
      compressionRatio: parseFloat(compressionRatio)
    };
  } catch (error) {
    console.error('❌ Error optimizing image:', error);
    throw new Error('Failed to optimize image: ' + error.message);
  }
};

/**
 * Convert image URI to base64 string
 * 
 * @param {string} uri - Image URI
 * @returns {Promise<string>} - Base64 encoded image
 */
export const uriToBase64 = async (uri) => {
  if (!uri) {
    throw new Error('Image URI is required');
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`📦 Converted image to base64: ${(base64.length / 1024).toFixed(1)}KB`);
    return base64;
  } catch (error) {
    console.error('❌ Error converting to base64:', error);
    throw new Error('Failed to convert image to base64: ' + error.message);
  }
};

/**
 * Validate image before processing
 * Checks file size, dimensions, and format
 * 
 * @param {string} uri - Image URI
 * @param {Object} options - Validation options
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 10)
 * @param {number} options.minWidth - Minimum width in pixels (default: 200)
 * @param {number} options.minHeight - Minimum height in pixels (default: 200)
 * @returns {Promise<Object>} - { valid, error, info }
 */
export const validateImage = async (uri, options = {}) => {
  if (!uri) {
    return { valid: false, error: 'Image URI is required' };
  }

  const {
    maxSizeMB = 10,
    minWidth = 200,
    minHeight = 200
  } = options;

  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    if (!fileInfo.exists) {
      return { valid: false, error: 'Image file does not exist' };
    }

    // Check file size
    const sizeMB = (fileInfo.size || 0) / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return { 
        valid: false, 
        error: `Image too large (${sizeMB.toFixed(1)}MB). Maximum: ${maxSizeMB}MB` 
      };
    }

    // Try to get image dimensions
    try {
      const asset = await ImageManipulator.manipulateAsync(uri, [], {});
      
      if (asset.width < minWidth || asset.height < minHeight) {
        return {
          valid: false,
          error: `Image too small (${asset.width}x${asset.height}). Minimum: ${minWidth}x${minHeight}`
        };
      }

      return {
        valid: true,
        info: {
          width: asset.width,
          height: asset.height,
          size: fileInfo.size,
          sizeMB: sizeMB.toFixed(2)
        }
      };
    } catch (dimensionError) {
      // If we can't get dimensions, but file exists and size is OK, assume valid
      return {
        valid: true,
        info: {
          size: fileInfo.size,
          sizeMB: sizeMB.toFixed(2)
        }
      };
    }
  } catch (error) {
    console.error('❌ Error validating image:', error);
    return { 
      valid: false, 
      error: 'Failed to validate image: ' + error.message 
    };
  }
};

/**
 * Process image from camera capture
 * Optimizes and converts to base64 in one step
 * 
 * @param {Object} photo - Photo object from camera
 * @param {string} photo.uri - Image URI
 * @param {string} photo.base64 - Base64 string (optional)
 * @returns {Promise<Object>} - { uri, base64, optimizedInfo }
 */
export const processCameraImage = async (photo) => {
  if (!photo || !photo.uri) {
    throw new Error('Invalid photo object');
  }

  try {
    console.log('📸 Processing camera image...');

    // If base64 is already provided and image is small enough, use it
    if (photo.base64) {
      const sizeKB = (photo.base64.length * 0.75) / 1024; // Approximate size
      
      if (sizeKB < 500) { // Less than 500KB
        console.log('✅ Using original image (already optimized)');
        return {
          uri: photo.uri,
          base64: photo.base64,
          optimizedInfo: {
            originalSize: sizeKB * 1024,
            optimizedSize: sizeKB * 1024,
            compressionRatio: 0
          }
        };
      }
    }

    // Optimize the image
    const optimized = await optimizeImage(photo.uri);

    return {
      uri: optimized.uri,
      base64: optimized.base64,
      optimizedInfo: {
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        compressionRatio: optimized.compressionRatio,
        width: optimized.width,
        height: optimized.height
      }
    };
  } catch (error) {
    console.error('❌ Error processing camera image:', error);
    
    // Fallback: try to use original if optimization fails
    if (photo.base64) {
      console.warn('⚠️ Using original image due to optimization failure');
      return {
        uri: photo.uri,
        base64: photo.base64,
        optimizedInfo: null
      };
    }
    
    throw error;
  }
};

/**
 * Process image from gallery
 * Handles both pre-encoded base64 and URI-only images
 * 
 * @param {Object} asset - Image asset from gallery picker
 * @param {string} asset.uri - Image URI
 * @param {string} asset.base64 - Base64 string (optional)
 * @returns {Promise<Object>} - { uri, base64, optimizedInfo }
 */
export const processGalleryImage = async (asset) => {
  if (!asset || !asset.uri) {
    throw new Error('Invalid image asset');
  }

  try {
    console.log('🖼️ Processing gallery image...');

    // Validate image first
    const validation = await validateImage(asset.uri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // If base64 is not provided, we need to optimize and get it
    if (!asset.base64) {
      const optimized = await optimizeImage(asset.uri);
      return {
        uri: optimized.uri,
        base64: optimized.base64,
        optimizedInfo: {
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          compressionRatio: optimized.compressionRatio
        }
      };
    }

    // If base64 is provided, check if we still need to optimize
    const base64SizeKB = (asset.base64.length * 0.75) / 1024;
    
    if (base64SizeKB > 800) { // Larger than 800KB
      console.log('📦 Image is large, optimizing...');
      const optimized = await optimizeImage(asset.uri);
      return {
        uri: optimized.uri,
        base64: optimized.base64,
        optimizedInfo: {
          originalSize: base64SizeKB * 1024,
          optimizedSize: optimized.optimizedSize,
          compressionRatio: optimized.compressionRatio
        }
      };
    }

    // Use provided base64
    console.log('✅ Using provided base64');
    return {
      uri: asset.uri,
      base64: asset.base64,
      optimizedInfo: {
        originalSize: base64SizeKB * 1024,
        optimizedSize: base64SizeKB * 1024,
        compressionRatio: 0
      }
    };
  } catch (error) {
    console.error('❌ Error processing gallery image:', error);
    throw error;
  }
};

/**
 * Estimate API upload time based on image size
 * 
 * @param {number} sizeBytes - Image size in bytes
 * @param {number} connectionSpeedMbps - Connection speed in Mbps (default: 10)
 * @returns {number} - Estimated time in seconds
 */
export const estimateUploadTime = (sizeBytes, connectionSpeedMbps = 10) => {
  const sizeMb = (sizeBytes * 8) / (1024 * 1024); // Convert to megabits
  const timeSeconds = sizeMb / connectionSpeedMbps;
  return Math.ceil(timeSeconds);
};

export default {
  optimizeImage,
  uriToBase64,
  validateImage,
  processCameraImage,
  processGalleryImage,
  estimateUploadTime
};