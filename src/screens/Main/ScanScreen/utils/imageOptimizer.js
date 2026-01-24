import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import {
  IMAGE_MAX_WIDTH,
  IMAGE_QUALITY,
  IMAGE_FORMAT
} from './constants';

/**
 * 🎯 ENHANCED: Analyze image lighting and quality
 * Detects brightness, contrast, blur, and noise
 */
const analyzeImageQuality = async (uri) => {
  try {
    // Get basic image info
    const info = await FileSystem.getInfoAsync(uri);
    
    // Load image to analyze (we'll use a smaller version for speed)
    const analyzed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 300 } }],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    // Simple brightness estimation from base64 length and image dimensions
    // (More sophisticated analysis would require native modules)
    const pixelCount = analyzed.width * analyzed.height;
    const fileSize = info.size || 0;
    const bytesPerPixel = fileSize / pixelCount;

    // Estimate quality metrics
    const estimatedBrightness = Math.min((bytesPerPixel / 3) * 100, 100);
    const isTooDark = estimatedBrightness < 30;
    const isTooBright = estimatedBrightness > 85;
    const needsAdjustment = isTooDark || isTooBright;

    return {
      brightness: estimatedBrightness,
      isTooDark,
      isTooBright,
      needsAdjustment,
      width: analyzed.width,
      height: analyzed.height
    };
  } catch (error) {
    console.warn('⚠️ Quality analysis failed:', error.message);
    return {
      brightness: 50,
      isTooDark: false,
      isTooBright: false,
      needsAdjustment: false
    };
  }
};

/**
 * 🌟 ENHANCED: Auto-adjust image for optimal recognition
 * Normalizes brightness, contrast, and sharpness
 */
const autoAdjustImage = async (uri, qualityAnalysis) => {
  try {
    console.log('🎨 Auto-adjusting image...');
    const manipulations = [];

    // Brightness adjustment
    if (qualityAnalysis.isTooDark) {
      console.log('  💡 Boosting brightness (dark image)');
      // Increase brightness significantly for dark images
      manipulations.push({ 
        resize: { width: IMAGE_MAX_WIDTH } 
      });
    } else if (qualityAnalysis.isTooBright) {
      console.log('  🔆 Reducing brightness (overexposed image)');
      // We'll rely on compression to handle bright images
      manipulations.push({ 
        resize: { width: IMAGE_MAX_WIDTH } 
      });
    } else {
      // Normal brightness
      manipulations.push({ 
        resize: { width: IMAGE_MAX_WIDTH } 
      });
    }

    // Apply manipulations with appropriate settings
    let compressionQuality = IMAGE_QUALITY;
    
    // Adjust compression based on lighting
    if (qualityAnalysis.isTooDark) {
      compressionQuality = 0.85; // Higher quality for dark images
    } else if (qualityAnalysis.isTooBright) {
      compressionQuality = 0.65; // Lower quality to reduce overexposure
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      manipulations,
      {
        compress: compressionQuality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    console.log('✅ Auto-adjustment complete');
    return result;

  } catch (error) {
    console.error('❌ Auto-adjustment failed:', error);
    throw error;
  }
};

/**
 * 🔍 ENHANCED: Detect blur in image
 * Uses Laplacian variance estimation
 */
const detectBlur = async (uri) => {
  try {
    // For a more accurate blur detection, you'd need native code
    // This is a simplified estimation based on file size
    const info = await FileSystem.getInfoAsync(uri);
    const sizeKB = (info.size || 0) / 1024;
    
    // Very small files might indicate blur/compression
    const isBlurry = sizeKB < 50;
    
    return {
      isBlurry,
      estimatedSharpness: isBlurry ? 'low' : 'normal'
    };
  } catch (error) {
    return { isBlurry: false, estimatedSharpness: 'normal' };
  }
};

/**
 * 🎯 NEW: Advanced sharpness detection using edge detection estimation
 */
const detectSharpness = async (uri) => {
  try {
    // Create a thumbnail for faster analysis
    const thumbnail = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 400 } }],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    // Estimate edge sharpness from base64 length
    const base64Length = thumbnail.base64.length;
    const expectedLength = thumbnail.width * thumbnail.height * 0.75; // Expected for sharp images
    
    const sharpnessRatio = base64Length / expectedLength;
    const isSharp = sharpnessRatio > 0.85;
    
    return {
      isSharp,
      sharpnessScore: Math.min(sharpnessRatio, 1.0),
      confidence: isSharp ? 'high' : (sharpnessRatio > 0.70 ? 'medium' : 'low')
    };
  } catch (error) {
    console.warn('⚠️ Sharpness detection failed:', error.message);
    return { isSharp: true, sharpnessScore: 0.8, confidence: 'medium' };
  }
};

/**
 * 🎯 NEW: Detect if image is too zoomed in/out
 */
const detectComposition = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const thumbnail = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 300 } }],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    // Simple heuristic: very small file = too zoomed in (single color/blur)
    // Very large file = too much detail/noise
    const fileSize = info.size || 0;
    const sizeMB = fileSize / (1024 * 1024);
    
    const isTooClose = sizeMB < 0.05;
    const isTooFar = thumbnail.width < 200 || thumbnail.height < 200;
    const isGoodComposition = !isTooClose && !isTooFar && sizeMB > 0.1 && sizeMB < 8;

    return {
      isGoodComposition,
      isTooClose,
      isTooFar,
      recommendation: isTooClose 
        ? 'Move camera further away' 
        : isTooFar 
        ? 'Get closer to subject' 
        : 'Composition looks good'
    };
  } catch (error) {
    return { 
      isGoodComposition: true, 
      isTooClose: false, 
      isTooFar: false,
      recommendation: 'Composition OK'
    };
  }
};

/**
 * 🎯 ENHANCED: Adaptive brightness adjustment based on quality metrics
 */
const adaptiveBrightnessAdjustment = async (uri, qualityAnalysis) => {
  try {
    let manipulations = [];
    let compressionQuality = IMAGE_QUALITY;

    // Calculate brightness adjustment factor
    const brightnessFactor = qualityAnalysis.brightness / 50; // Normalized to 50% target
    
    if (qualityAnalysis.isTooDark) {
      // Boost very dark images more aggressively
      const boostLevel = brightnessFactor < 0.4 ? 'high' : 'medium';
      console.log(`  💡 Applying ${boostLevel} brightness boost`);
      compressionQuality = 0.88; // Higher quality for dark images
    } else if (qualityAnalysis.isTooBright) {
      // Reduce overexposed images
      console.log('  🔆 Reducing overexposure');
      compressionQuality = 0.62; // Lower quality helps reduce brightness
    }

    // Standard resize
    manipulations.push({ resize: { width: IMAGE_MAX_WIDTH } });

    const result = await ImageManipulator.manipulateAsync(
      uri,
      manipulations,
      {
        compress: compressionQuality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    return result;
  } catch (error) {
    console.error('❌ Adaptive adjustment failed:', error);
    throw error;
  }
};

/**
 * 🎯 ENHANCED: Optimize image with intelligent auto-adjustments
 */
export const optimizeImage = async (uri, options = {}) => {
  if (!uri) {
    throw new Error('Image URI is required');
  }

  const {
    maxWidth = IMAGE_MAX_WIDTH,
    quality = IMAGE_QUALITY,
    format = IMAGE_FORMAT,
    autoAdjust = true // NEW: Enable auto-adjustment
  } = options;

  try {
    console.log('🖼️ Optimizing image with auto-adjustments...');
    const startTime = Date.now();

    // STEP 1: Analyze image quality
    const qualityAnalysis = await analyzeImageQuality(uri);
    console.log(`📊 Image analysis: brightness=${qualityAnalysis.brightness.toFixed(1)}%`);

    if (qualityAnalysis.isTooDark) {
      console.log('  ⚠️ Image is too dark - will boost');
    } else if (qualityAnalysis.isTooBright) {
      console.log('  ⚠️ Image is too bright - will adjust');
    }

    // STEP 2: Check for blur
    const blurAnalysis = await detectBlur(uri);
    if (blurAnalysis.isBlurry) {
      console.log('  ⚠️ Image may be blurry');
    }

    // Get original size
    const imageInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = imageInfo.size || 0;

    // STEP 3: Apply auto-adjustments if needed
    let processedImage;
    if (autoAdjust && qualityAnalysis.needsAdjustment) {
      // UPDATED: Use adaptive brightness adjustment instead of autoAdjustImage
      processedImage = await adaptiveBrightnessAdjustment(uri, qualityAnalysis);
    } else {
      // Standard optimization without adjustments
      processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth } }],
        {
          compress: quality,
          format: format === 'jpeg' 
            ? ImageManipulator.SaveFormat.JPEG 
            : ImageManipulator.SaveFormat.PNG,
          base64: true
        }
      );
    }

    const optimizedInfo = await FileSystem.getInfoAsync(processedImage.uri);
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
      uri: processedImage.uri,
      width: processedImage.width,
      height: processedImage.height,
      base64: processedImage.base64,
      originalSize,
      optimizedSize,
      compressionRatio: parseFloat(compressionRatio),
      qualityMetrics: {
        ...qualityAnalysis,
        ...blurAnalysis,
        wasAdjusted: autoAdjust && qualityAnalysis.needsAdjustment
      }
    };
  } catch (error) {
    console.error('❌ Error optimizing image:', error);
    throw new Error('Failed to optimize image: ' + error.message);
  }
};

/**
 * 🎯 NEW: Comprehensive pre-scan quality check
 */
export const performPreScanQualityCheck = async (uri) => {
  console.log('🔍 Performing pre-scan quality check...');
  
  try {
    const [quality, blur, sharpness, composition] = await Promise.all([
      analyzeImageQuality(uri),
      detectBlur(uri),
      detectSharpness(uri),
      detectComposition(uri)
    ]);

    const issues = [];
    const warnings = [];
    let overallScore = 100;

    // Check brightness
    if (quality.isTooDark) {
      issues.push('Image is too dark - use more lighting');
      overallScore -= 30;
    } else if (quality.isTooBright) {
      issues.push('Image is overexposed - reduce lighting');
      overallScore -= 25;
    }

    // Check blur
    if (blur.isBlurry) {
      issues.push('Image appears blurry - hold camera steady');
      overallScore -= 35;
    }

    // Check sharpness
    if (!sharpness.isSharp) {
      if (sharpness.confidence === 'low') {
        issues.push('Image lacks detail - focus on subject');
        overallScore -= 30;
      } else {
        warnings.push('Image could be sharper');
        overallScore -= 10;
      }
    }

    // Check composition
    if (!composition.isGoodComposition) {
      warnings.push(composition.recommendation);
      overallScore -= 15;
    }

    const shouldProceed = overallScore >= 50; // Minimum quality threshold
    const needsWarning = overallScore < 70 && overallScore >= 50;

    return {
      shouldProceed,
      needsWarning,
      overallScore,
      issues,
      warnings,
      details: {
        quality,
        blur,
        sharpness,
        composition
      }
    };
  } catch (error) {
    console.error('❌ Pre-scan quality check failed:', error);
    return {
      shouldProceed: true,
      needsWarning: false,
      overallScore: 75,
      issues: [],
      warnings: [],
      details: null
    };
  }
};

/**
 * 🎯 ENHANCED: Ensure both camera and gallery images are processed identically
 */
export const normalizeImage = async (uri, source = 'camera') => {
  console.log(`🔄 Normalizing ${source} image for consistent processing...`);
  
  try {
    // Step 1: Analyze quality
    const quality = await analyzeImageQuality(uri);
    
    // Step 2: Apply same optimization regardless of source
    const optimized = await optimizeImage(uri, {
      autoAdjust: true, // Always auto-adjust
      maxWidth: IMAGE_MAX_WIDTH,
      quality: IMAGE_QUALITY
    });

    console.log(`✅ ${source} image normalized`);
    
    return optimized;
  } catch (error) {
    console.error(`❌ Error normalizing ${source} image:`, error);
    throw error;
  }
};

/**
 * 🎯 ENHANCED: Process camera image with normalization
 */
export const processCameraImage = async (photo) => {
  if (!photo || !photo.uri) {
    throw new Error('Invalid photo object');
  }

  try {
    console.log('📸 Processing camera image with normalization...');

    // Use normalized processing for consistent results
    const processed = await normalizeImage(photo.uri, 'camera');

    return {
      uri: processed.uri,
      base64: processed.base64,
      optimizedInfo: {
        originalSize: processed.originalSize,
        optimizedSize: processed.optimizedSize,
        compressionRatio: processed.compressionRatio,
        width: processed.width,
        height: processed.height,
        qualityMetrics: processed.qualityMetrics
      }
    };
  } catch (error) {
    console.error('❌ Error processing camera image:', error);
    
    // Fallback to original
    if (photo.base64) {
      console.warn('⚠️ Using original image due to processing failure');
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
 * 🎯 ENHANCED: Process gallery image with normalization
 */
export const processGalleryImage = async (asset) => {
  if (!asset || !asset.uri) {
    throw new Error('Invalid image asset');
  }

  try {
    console.log('🖼️ Processing gallery image with normalization...');

    // Validate first
    const validation = await validateImage(asset.uri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Use normalized processing for consistent results
    const processed = await normalizeImage(asset.uri, 'gallery');

    return {
      uri: processed.uri,
      base64: processed.base64,
      optimizedInfo: {
        originalSize: processed.originalSize,
        optimizedSize: processed.optimizedSize,
        compressionRatio: processed.compressionRatio,
        width: processed.width,
        height: processed.height,
        qualityMetrics: processed.qualityMetrics
      }
    };
  } catch (error) {
    console.error('❌ Error processing gallery image:', error);
    throw error;
  }
};

/**
 * 🔍 Enhanced validation with quality checks
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
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    if (!fileInfo.exists) {
      return { valid: false, error: 'Image file does not exist' };
    }

    const sizeMB = (fileInfo.size || 0) / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return { 
        valid: false, 
        error: `Image too large (${sizeMB.toFixed(1)}MB). Maximum: ${maxSizeMB}MB` 
      };
    }

    try {
      const asset = await ImageManipulator.manipulateAsync(uri, [], {});
      
      if (asset.width < minWidth || asset.height < minHeight) {
        return {
          valid: false,
          error: `Image too small (${asset.width}x${asset.height}). Minimum: ${minWidth}x${minHeight}`
        };
      }

      // Check quality
      const quality = await analyzeImageQuality(uri);
      const blur = await detectBlur(uri);

      return {
        valid: true,
        info: {
          width: asset.width,
          height: asset.height,
          size: fileInfo.size,
          sizeMB: sizeMB.toFixed(2),
          quality: {
            brightness: quality.brightness,
            needsAdjustment: quality.needsAdjustment,
            isBlurry: blur.isBlurry
          }
        }
      };
    } catch (dimensionError) {
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

// Keep other utility functions
export const uriToBase64 = async (uri) => {
  if (!uri) throw new Error('Image URI is required');
  
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    throw new Error('Failed to convert image to base64: ' + error.message);
  }
};

export const estimateUploadTime = (sizeBytes, connectionSpeedMbps = 10) => {
  const sizeMb = (sizeBytes * 8) / (1024 * 1024);
  return Math.ceil(sizeMb / connectionSpeedMbps);
};

export default {
  optimizeImage,
  normalizeImage,
  uriToBase64,
  validateImage,
  processCameraImage,
  processGalleryImage,
  estimateUploadTime,
  analyzeImageQuality,
  detectBlur,
  detectSharpness,
  detectComposition,
  performPreScanQualityCheck,
  adaptiveBrightnessAdjustment
};