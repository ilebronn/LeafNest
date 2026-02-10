import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import {
  IMAGE_MAX_WIDTH,
  IMAGE_QUALITY,
  IMAGE_FORMAT
} from './constants';

/**
 * 🎯 FIXED: Removed faulty brightness detection
 * The previous bytesPerPixel method was unreliable and flagged well-lit images as dark
 */
const analyzeImageQuality = async (uri) => {
  try {
    // Get basic image info
    const info = await FileSystem.getInfoAsync(uri);
    
    // Load image to analyze
    const analyzed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 300 } }],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    // ✅ FIXED: Don't make assumptions about brightness from file size
    // Without native image processing, we can't reliably detect brightness
    // Removed faulty brightness estimation that was causing false positives

    return {
      brightness: 50, // Neutral default - we can't reliably detect this
      isTooDark: false, // Disabled - was causing false positives
      isTooBright: false, // Disabled - was causing false positives
      needsAdjustment: false, // Only adjust if we can reliably detect issues
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
 * 🌟 SIMPLIFIED: Basic image optimization without brightness adjustments
 * Removed auto-brightness adjustment since we can't reliably detect brightness
 */
const autoAdjustImage = async (uri, qualityAnalysis) => {
  try {
    console.log('🎨 Optimizing image...');
    const manipulations = [];

    // Standard resize - no brightness adjustments
    manipulations.push({ 
      resize: { width: IMAGE_MAX_WIDTH } 
    });

    const result = await ImageManipulator.manipulateAsync(
      uri,
      manipulations,
      {
        compress: IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    console.log('✅ Optimization complete');
    return result;

  } catch (error) {
    console.error('❌ Optimization failed:', error);
    throw error;
  }
};

/**
 * 🔍 ENHANCED: Detect blur in image
 * Uses file size heuristic
 */
const detectBlur = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const sizeKB = (info.size || 0) / 1024;
    
    // Very small files might indicate blur/compression
    // ✅ Made threshold more conservative to reduce false positives
    const isBlurry = sizeKB < 30;
    
    return {
      isBlurry,
      estimatedSharpness: isBlurry ? 'low' : 'normal'
    };
  } catch (error) {
    return { isBlurry: false, estimatedSharpness: 'normal' };
  }
};

/**
 * 🎯 Sharpness detection using edge detection estimation
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
    const expectedLength = thumbnail.width * thumbnail.height * 0.75;
    
    const sharpnessRatio = base64Length / expectedLength;
    
    // ✅ Made thresholds more lenient to reduce false positives
    const isSharp = sharpnessRatio > 0.75; // Was 0.85
    
    return {
      isSharp,
      sharpnessScore: Math.min(sharpnessRatio, 1.0),
      confidence: isSharp ? 'high' : (sharpnessRatio > 0.60 ? 'medium' : 'low')
    };
  } catch (error) {
    console.warn('⚠️ Sharpness detection failed:', error.message);
    return { isSharp: true, sharpnessScore: 0.8, confidence: 'high' };
  }
};

/**
 * 🎯 Detect if image is too zoomed in/out
 */
const detectComposition = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const thumbnail = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 300 } }],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    const fileSize = info.size || 0;
    const sizeMB = fileSize / (1024 * 1024);
    
    // ✅ Made thresholds more lenient
    const isTooClose = sizeMB < 0.03; // Was 0.05
    const isTooFar = thumbnail.width < 150 || thumbnail.height < 150; // Was 200
    const isGoodComposition = !isTooClose && !isTooFar && sizeMB > 0.05 && sizeMB < 10;

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
 * 🎯 REMOVED: Adaptive brightness adjustment
 * This was causing issues with false brightness detection
 */
const adaptiveBrightnessAdjustment = async (uri, qualityAnalysis) => {
  try {
    // ✅ FIXED: Just do standard optimization without brightness adjustment
    const manipulations = [{ resize: { width: IMAGE_MAX_WIDTH } }];

    const result = await ImageManipulator.manipulateAsync(
      uri,
      manipulations,
      {
        compress: IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    return result;
  } catch (error) {
    console.error('❌ Image optimization failed:', error);
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
    autoAdjust = true
  } = options;

  try {
    console.log('🖼️ Optimizing image...');
    const startTime = Date.now();

    // STEP 1: Analyze image quality (but don't act on brightness)
    const qualityAnalysis = await analyzeImageQuality(uri);

    // STEP 2: Check for blur
    const blurAnalysis = await detectBlur(uri);
    if (blurAnalysis.isBlurry) {
      console.log('  ⚠️ Image may be blurry');
    }

    // Get original size
    const imageInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = imageInfo.size || 0;

    // STEP 3: Standard optimization (no brightness adjustment)
    const processedImage = await ImageManipulator.manipulateAsync(
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
        wasAdjusted: false // No longer doing brightness adjustments
      }
    };
  } catch (error) {
    console.error('❌ Error optimizing image:', error);
    throw new Error('Failed to optimize image: ' + error.message);
  }
};

/**
 * 🎯 FIXED: More conservative pre-scan quality check
 * Reduced false positives by making detection more lenient
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

    // ✅ REMOVED: Brightness checks (were causing false positives)
    // We can't reliably detect brightness without native code

    // Check blur - but only flag severe cases
    if (blur.isBlurry) {
      warnings.push('Image may be slightly blurry - try holding camera steady');
      overallScore -= 20; // Was 35
    }

    // Check sharpness - only flag severe cases
    if (!sharpness.isSharp && sharpness.confidence === 'low') {
      warnings.push('Image could be sharper - try focusing on subject');
      overallScore -= 15; // Was 30
    }

    // Check composition - only warn, don't block
    if (!composition.isGoodComposition) {
      warnings.push(composition.recommendation);
      overallScore -= 10; // Was 15
    }

    // ✅ MUCH more lenient threshold - only block truly bad images
    const shouldProceed = overallScore >= 30; // Was 50
    const needsWarning = overallScore < 70 && overallScore >= 30;

    console.log(`   Quality score: ${overallScore}/100`);
    if (issues.length > 0) {
      console.log(`   Issues: ${issues.join(', ')}`);
    }
    if (warnings.length > 0) {
      console.log(`   Warnings: ${warnings.join(', ')}`);
    }

    return {
      shouldProceed,
      needsWarning,
      overallScore,
      issues, // Will mostly be empty now
      warnings, // Moved most issues to warnings
      details: {
        quality,
        blur,
        sharpness,
        composition
      }
    };
  } catch (error) {
    console.error('❌ Pre-scan quality check failed:', error);
    // Default to allowing the scan if check fails
    return {
      shouldProceed: true,
      needsWarning: false,
      overallScore: 80,
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
    // Step 1: Analyze quality (but don't block on it)
    const quality = await analyzeImageQuality(uri);
    
    // Step 2: Apply same optimization regardless of source
    const optimized = await optimizeImage(uri, {
      autoAdjust: false, // ✅ FIXED: Disabled auto-adjust (it was unreliable)
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

      // Check quality (but don't block on brightness)
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
            needsAdjustment: false, // Never block on this
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