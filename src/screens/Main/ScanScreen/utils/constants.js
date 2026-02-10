// src/screens/Main/ScanScreen/utils/constants.js
// ===========================
// CACHE CONFIGURATION
// ===========================
export const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_CACHE_SIZE = 100; // Maximum number of cached species
export const CACHE_SAVE_DEBOUNCE_MS = 5000; // 5 seconds debounce for cache saving
export const CACHE_STORAGE_KEY = 'species_cache';

// ===========================
// CONFIDENCE & SCORING - OPTIMIZED
// ===========================
export const CONFIDENCE_THRESHOLD = 35; // Lowered from 40 for more results
export const MIN_OBSERVATIONS_FOR_BOOST = 500; // Lowered from 1000 for broader boost
export const MAX_CONFIDENCE_DISPLAY = 95; // Keep at 95
export const CONFIDENCE_BOOST_MULTIPLIER = 1.12; // Increased from 1.1

// ===========================
// TAXONOMIC FILTERING CONSTANTS
// ===========================
export const TAXONOMIC_RANKS = {
  SPECIES: 'species',
  SUBSPECIES: 'subspecies',
  VARIETY: 'variety',
  FORM: 'form',
  HYBRID: 'hybrid',
  GENUS: 'genus',
  FAMILY: 'family',
  ORDER: 'order',
  CLASS: 'class',
  PHYLUM: 'phylum',
  KINGDOM: 'kingdom'
};

export const DESIRED_RANKS = [
  TAXONOMIC_RANKS.SPECIES,
  TAXONOMIC_RANKS.SUBSPECIES,
  TAXONOMIC_RANKS.VARIETY,
  TAXONOMIC_RANKS.FORM,
  TAXONOMIC_RANKS.HYBRID
];

export const GENERIC_RANKS = [
  TAXONOMIC_RANKS.FAMILY,
  TAXONOMIC_RANKS.ORDER,
  TAXONOMIC_RANKS.CLASS,
  TAXONOMIC_RANKS.PHYLUM,
  TAXONOMIC_RANKS.KINGDOM
];

// ===========================
// IMAGE PROCESSING
// ===========================
export const IMAGE_MAX_WIDTH = 1024; // Maximum image width in pixels
export const IMAGE_QUALITY = 0.7; // JPEG compression quality (0-1)
export const IMAGE_FORMAT = 'jpeg'; // Image format for processing

// ===========================
// API CONFIGURATION
// ===========================
export const API_TIMEOUT_MS = 15000; // 15 seconds timeout for API calls
export const RETRY_ATTEMPTS = 3; // Number of retry attempts for failed API calls
export const RETRY_DELAY_BASE_MS = 1000; // Base delay for exponential backoff (1 second)

// ===========================
// VISION API CONFIGURATION - OPTIMIZED
// ===========================
export const VISION_MAX_LABELS = 30; // Increased from 25
export const VISION_MAX_WEB_ENTITIES = 25; // Increased from 20
export const MAX_CANDIDATES_TO_PROCESS = 20; // Increased from 15
export const MAX_CANDIDATES_FOR_CACHE_CHECK = 5; // How many top candidates to check in cache
export const MAX_CANDIDATES_FOR_SEARCH = 10; // Increased from 8

// ===========================
// COMMON SPECIES (for scoring boost)
// ===========================
export const COMMON_SPECIES = new Set([
  'dog', 'cat', 'bird', 'tree', 'flower', 'grass', 'rose', 'oak', 'pine',
  'maple', 'butterfly', 'bee', 'ant', 'spider', 'fish', 'eagle', 'hawk',
  'robin', 'sparrow', 'daisy', 'sunflower', 'tulip', 'dandelion', 'lily',
  'orchid', 'fern', 'moss', 'mushroom', 'beetle', 'dragonfly', 'moth',
  'snake', 'lizard', 'frog', 'turtle', 'rabbit', 'deer', 'squirrel'
]);

// ===========================
// GENERIC TERMS TO FILTER OUT
// ===========================
export const GENERIC_TERMS = new Set([
  'photo', 'image', 'picture', 'camera', 'photography', 
  'outdoor', 'natural', 'environment', 'view', 'scene',
  'nature', 'background', 'landscape', 'closeup', 'macro',
  'shot', 'capture', 'snapshot', 'wildlife photography',
  // Add generic biological terms
  'plantae', 'animalia', 'fungi', 'bacteria', 'archaea', 'protista',
  'phylum', 'classis', 'ordo', 'familia', 'genus', 'species',
  'chordata', 'arthropoda', 'mollusca', 'annelida',
  'magnoliopsida', 'liliopsida', 'pinopsida',
  'mammalia', 'aves', 'reptilia', 'amphibia', 'actinopterygii'
]);

// ===========================
// PLANT & ANIMAL KEYWORDS
// ===========================
export const PLANT_KEYWORDS = [
  'plant', 'flower', 'tree', 'leaf', 'grass', 'herb', 'shrub', 
  'vegetation', 'flora', 'botanical', 'foliage', 'petal', 'stem',
  'root', 'blossom', 'bloom', 'vine', 'bush', 'fern', 'moss',
  'seedling', 'sprout', 'branch', 'twig',
  // Fungi terms (treated as plant-like for scan validation)
  'fungus', 'fungi', 'mushroom', 'lichen', 'mold'
];

export const ANIMAL_KEYWORDS = [
  'animal', 'bird', 'insect', 'fish', 'mammal', 'reptile',
  'amphibian', 'wildlife', 'fauna', 'creature', 'pet',
  'wing', 'feather', 'fur', 'beak', 'claw', 'tail', 'fin',
  'paw', 'whisker', 'whiskers', 'snout', 'muzzle', 'hoof', 'antler'
];

// Human-specific keywords (handled separately from general animal detection)
export const HUMAN_KEYWORDS = [
  'person', 'people', 'human', 'man', 'woman', 'child', 'boy', 'girl',
  'selfie', 'portrait', 'face', 'head', 'chin', 'cheek', 'forehead', 'smile',
  'beard', 'mustache', 'eye', 'eyes', 'nose', 'mouth', 'lips', 'ear', 'teeth',
  'hair'
];

// Weak animal signals that require stronger context
export const WEAK_ANIMAL_KEYWORDS = [
  'scale'
];

// ===========================
// IRRELEVANT KEYWORDS (not plants/animals)
// ===========================
export const IRRELEVANT_KEYWORDS = [
  'building', 'architecture', 'car', 'vehicle', 'furniture',
  'food', 'dish', 'meal', 'object', 'tool', 'device', 'machine',
  'electronics', 'indoor', 'room', 'text', 'sign',
  'street', 'road', 'sky', 'water', 'rock', 'stone',
  // Common non-biological objects
  'chair', 'table', 'desk', 'seat', 'stool', 'sofa', 'couch',
  'appliance', 'instrument', 'equipment', 'gadget',
  'screen', 'monitor', 'keyboard', 'mouse', 'phone',
  'clock', 'gauge', 'meter', 'dial', 'weighing',
  'floor', 'wall', 'ceiling',
  // Clothing/footwear and accessories
  'clothes', 'clothing', 'apparel', 'garment',
  'shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'boot', 'boots',
  'sock', 'socks', 'lace', 'laces', 'shoelace', 'shoelaces',
  'sole', 'insole', 'insoles', 'tread',
  'leather', 'fabric', 'rubber'
];

// ===========================
// SCORING WEIGHTS - OPTIMIZED
// ===========================
export const SCORE_WEIGHTS = {
  EXACT_MATCH: 100,
  COMMON_NAME_EXACT: 95, // Increased from 90
  CONTAINS_MATCH: 55, // Increased from 50
  COMMON_NAME_CONTAINS: 45, // Increased from 40
  PARTIAL_MATCH: 35, // Increased from 30
  SPECIES_RANK: 65, // Increased from 60
  SUBSPECIES_RANK: 55, // Increased from 50
  GENUS_RANK: 25, // Increased from 20
  OTHER_RANK_PENALTY: -15, // More penalty
  OBSERVATIONS_50K_PLUS: 45, // Increased from 40
  OBSERVATIONS_10K_PLUS: 35, // Increased from 30
  OBSERVATIONS_1K_PLUS: 25, // Increased from 20
  OBSERVATIONS_100_PLUS: 15, // Increased from 10
  OBSERVATIONS_UNDER_10_PENALTY: -25, // More penalty
  PHOTO_AVAILABLE: 18, // Increased from 15
  WIKIPEDIA_AVAILABLE: 12, // Increased from 10
  COMMON_SPECIES_BOOST: 1.35, // Increased from 1.3
  BEST_GUESS_LABEL_SCORE: 100,
  WEB_ENTITY_MULTIPLIER: 0.85, // Increased from 0.8
  LABEL_ANNOTATION_MULTIPLIER: 0.65, // Increased from 0.6
  VISION_API_WEIGHT: 0.55 // Increased from 0.5
};

// ===========================
// RELEVANCE THRESHOLDS - OPTIMIZED
// ===========================
export const RELEVANCE_THRESHOLD = 0.45; // Lowered from 0.5 for more inclusivity
export const INATURALIST_SEARCH_DELAY_MS = 200; // Delay between iNaturalist searches

// ===========================
// CAMERA SETTINGS
// ===========================
export const DEFAULT_ZOOM = 0;
export const MAX_ZOOM = 1;
export const MIN_ZOOM = 0;
export const ZOOM_INCREMENT = 0.1;
export const PINCH_ZOOM_SENSITIVITY = 0.02;

export const FLASH_MODES = {
  OFF: 'off',
  ON: 'on',
  AUTO: 'auto'
};

export const AUTOFOCUS_MODES = {
  ON: 'on',
  OFF: 'off'
};

// ===========================
// UI MESSAGES
// ===========================
export const ERROR_MESSAGES = {
  NO_CAMERA_PERMISSION: 'We need your permission to show the camera',
  NO_GALLERY_PERMISSION: 'Please grant access to your photo library to select images.',
  CAPTURE_FAILED: 'There was an issue capturing the photo.',
  GALLERY_FAILED: 'Failed to load image from gallery. Please try again.',
  NETWORK_ERROR: 'Could not analyze the image. Please check your internet connection.',
  NO_INTERNET: 'No Internet Connection',
  CHECK_CONNECTION: 'Please check your internet connection and try again.',
  UNIDENTIFIED_SPECIES: 'Could not identify the species. Our study focuses on plants and animals only.',
  NOT_PLANT_OR_ANIMAL: 'The image does not appear to be a plant or animal.\n\nOur study focuses on plants and animals only.',
  PROCESSING_ERROR: 'An error occurred while processing the image. Please try again.'
};

export const SUCCESS_MESSAGES = {
  SPECIES_IDENTIFIED: 'Species identified successfully!',
  CACHED_RESULT: 'Found in cache - instant result!'
};

export const PROCESSING_STAGES = {
  ANALYZING: 'Analyzing image...',
  SEARCHING: 'Searching database...',
  FOUND_MATCH: 'Found match!',
  LOADING_DETAILS: 'Loading details...',
  OPTIMIZING: 'Using optimized search...'
};

// ===========================
// FEEDBACK CONFIGURATION
// ===========================
export const FEEDBACK_STORAGE_PREFIX = 'feedback_';
export const MAX_FEEDBACK_RECORDS = 50; // Limit feedback records stored locally

// ===========================
// GUEST MODE
// ===========================
export const GUEST_SCAN_LIMIT = 5; // Number of free scans for guest users

// ===========================
// EXPORT DEFAULT
// ===========================
export default {
  CACHE_EXPIRY_MS,
  MAX_CACHE_SIZE,
  CACHE_SAVE_DEBOUNCE_MS,
  CACHE_STORAGE_KEY,
  CONFIDENCE_THRESHOLD,
  MIN_OBSERVATIONS_FOR_BOOST,
  MAX_CONFIDENCE_DISPLAY,
  CONFIDENCE_BOOST_MULTIPLIER,
  TAXONOMIC_RANKS,
  DESIRED_RANKS,
  GENERIC_RANKS,
  IMAGE_MAX_WIDTH,
  IMAGE_QUALITY,
  IMAGE_FORMAT,
  API_TIMEOUT_MS,
  RETRY_ATTEMPTS,
  RETRY_DELAY_BASE_MS,
  VISION_MAX_LABELS,
  VISION_MAX_WEB_ENTITIES,
  MAX_CANDIDATES_TO_PROCESS,
  MAX_CANDIDATES_FOR_CACHE_CHECK,
  MAX_CANDIDATES_FOR_SEARCH,
  COMMON_SPECIES,
  GENERIC_TERMS,
  PLANT_KEYWORDS,
  ANIMAL_KEYWORDS,
  HUMAN_KEYWORDS,
  WEAK_ANIMAL_KEYWORDS,
  IRRELEVANT_KEYWORDS,
  SCORE_WEIGHTS,
  RELEVANCE_THRESHOLD,
  INATURALIST_SEARCH_DELAY_MS,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_INCREMENT,
  PINCH_ZOOM_SENSITIVITY,
  FLASH_MODES,
  AUTOFOCUS_MODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PROCESSING_STAGES,
  FEEDBACK_STORAGE_PREFIX,
  MAX_FEEDBACK_RECORDS,
  GUEST_SCAN_LIMIT
};