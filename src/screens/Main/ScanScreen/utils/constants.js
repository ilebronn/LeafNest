// ===========================
// CACHE CONFIGURATION
// ===========================
export const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_CACHE_SIZE = 100; // Maximum number of cached species
export const CACHE_SAVE_DEBOUNCE_MS = 5000; // 5 seconds debounce for cache saving
export const CACHE_STORAGE_KEY = 'species_cache';

// ===========================
// CONFIDENCE & SCORING
// ===========================
export const CONFIDENCE_THRESHOLD = 40; // Minimum confidence to fetch iNat details
export const MIN_OBSERVATIONS_FOR_BOOST = 1000; // Observation count for reliability boost
export const MAX_CONFIDENCE_DISPLAY = 95; // Maximum confidence to show to user
export const CONFIDENCE_BOOST_MULTIPLIER = 1.1; // Boost multiplier for reliable species

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
// VISION API CONFIGURATION
// ===========================
export const VISION_MAX_LABELS = 25; // Maximum labels to request from Vision API
export const VISION_MAX_WEB_ENTITIES = 20; // Maximum web entities from Vision API
export const MAX_CANDIDATES_TO_PROCESS = 15; // Maximum candidates to extract
export const MAX_CANDIDATES_FOR_CACHE_CHECK = 5; // How many top candidates to check in cache
export const MAX_CANDIDATES_FOR_SEARCH = 8; // Maximum candidates to search in iNaturalist

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
  'shot', 'capture', 'snapshot', 'wildlife photography'
]);

// ===========================
// PLANT & ANIMAL KEYWORDS
// ===========================
export const PLANT_KEYWORDS = [
  'plant', 'flower', 'tree', 'leaf', 'grass', 'herb', 'shrub', 
  'vegetation', 'flora', 'botanical', 'foliage', 'petal', 'stem',
  'root', 'blossom', 'bloom', 'vine', 'bush', 'fern', 'moss',
  'seedling', 'sprout', 'branch', 'twig'
];

export const ANIMAL_KEYWORDS = [
  'animal', 'bird', 'insect', 'fish', 'mammal', 'reptile', 
  'amphibian', 'wildlife', 'fauna', 'creature', 'pet', 'wing',
  'feather', 'fur', 'scale', 'beak', 'claw', 'tail', 'fin'
];

// ===========================
// IRRELEVANT KEYWORDS (not plants/animals)
// ===========================
export const IRRELEVANT_KEYWORDS = [
  'person', 'people', 'human', 'man', 'woman', 'child', 'face', 
  'hand', 'building', 'architecture', 'car', 'vehicle', 'furniture', 
  'food', 'dish', 'meal', 'object', 'tool', 'device', 'machine', 
  'electronics', 'clothing', 'indoor', 'room', 'text', 'sign',
  'street', 'road', 'sky', 'water', 'rock', 'stone'
];

// ===========================
// SCORING WEIGHTS
// ===========================
export const SCORE_WEIGHTS = {
  EXACT_MATCH: 100,
  COMMON_NAME_EXACT: 90,
  CONTAINS_MATCH: 50,
  COMMON_NAME_CONTAINS: 40,
  PARTIAL_MATCH: 30,
  SPECIES_RANK: 60,
  SUBSPECIES_RANK: 50,
  GENUS_RANK: 20,
  OTHER_RANK_PENALTY: -10,
  OBSERVATIONS_50K_PLUS: 40,
  OBSERVATIONS_10K_PLUS: 30,
  OBSERVATIONS_1K_PLUS: 20,
  OBSERVATIONS_100_PLUS: 10,
  OBSERVATIONS_UNDER_10_PENALTY: -20,
  PHOTO_AVAILABLE: 15,
  WIKIPEDIA_AVAILABLE: 10,
  COMMON_SPECIES_BOOST: 1.3,
  BEST_GUESS_LABEL_SCORE: 100,
  WEB_ENTITY_MULTIPLIER: 0.8,
  LABEL_ANNOTATION_MULTIPLIER: 0.6,
  VISION_API_WEIGHT: 0.5
};

// ===========================
// RELEVANCE THRESHOLDS
// ===========================
export const RELEVANCE_THRESHOLD = 0.5; // Minimum relevance score for plant/animal
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
  IMAGE_MAX_WIDTH,
  IMAGE_QUALITY,
  IMAGE_FORMAT,
  API_TIMEOUT_MS,
  RETRY_ATTEMPTS,
  RETRY_DELAY_BASE_MS,
  VISION_MAX_LABELS,
  VISION_MAX_WEB_ENTITIES,
  MAX_CANDIDATES_TO_PROCESS,
  COMMON_SPECIES,
  GENERIC_TERMS,
  PLANT_KEYWORDS,
  ANIMAL_KEYWORDS,
  IRRELEVANT_KEYWORDS,
  SCORE_WEIGHTS,
  RELEVANCE_THRESHOLD,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_INCREMENT,
  FLASH_MODES,
  AUTOFOCUS_MODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PROCESSING_STAGES,
  GUEST_SCAN_LIMIT
};