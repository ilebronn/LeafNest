import axios from 'axios';
import { 
  API_TIMEOUT_MS, 
  RETRY_ATTEMPTS, 
  RETRY_DELAY_BASE_MS 
} from '@screens/Main/ScanScreen/utils/constants';

/**
 * Exponential backoff delay calculation
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} - Delay in milliseconds
 */
const calculateBackoffDelay = (attempt, baseDelay = RETRY_DELAY_BASE_MS) => {
  // Exponential: 1s, 2s, 4s, 8s...
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;
  return exponentialDelay + jitter;
};

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} - True if error is retryable
 */
const isRetryableError = (error) => {
  if (!error) return false;

  // Network errors
  if (error.message?.includes('Network Error')) return true;
  if (error.code === 'ECONNABORTED') return true;
  if (error.code === 'ETIMEDOUT') return true;

  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.response?.status && retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  return false;
};

/**
 * Fetch with retry logic and exponential backoff
 * @param {Function} fetchFunction - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default: RETRY_ATTEMPTS)
 * @param {number} options.baseDelay - Base delay for backoff (default: RETRY_DELAY_BASE_MS)
 * @param {Function} options.onRetry - Callback on retry (receives attempt number and error)
 * @returns {Promise<any>} - Result of fetchFunction
 */
export const fetchWithRetry = async (fetchFunction, options = {}) => {
  const {
    maxRetries = RETRY_ATTEMPTS,
    baseDelay = RETRY_DELAY_BASE_MS,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fetchFunction();
      
      if (attempt > 0) {
        console.log(`✅ Request succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = attempt < maxRetries - 1 && isRetryableError(error);

      if (!shouldRetry) {
        console.error(`❌ Request failed after ${attempt + 1} attempts:`, error.message);
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, baseDelay);
      console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`);
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but just in case
  throw lastError;
};

/**
 * Make GET request with retry logic
 * @param {string} url - Request URL
 * @param {Object} config - Axios config object
 * @param {Object} retryOptions - Retry options (see fetchWithRetry)
 * @returns {Promise<Object>} - Axios response
 */
export const getWithRetry = async (url, config = {}, retryOptions = {}) => {
  if (!url) {
    throw new Error('URL is required for GET request');
  }

  const fetchFunction = () => axios.get(url, {
    timeout: API_TIMEOUT_MS,
    ...config
  });

  return fetchWithRetry(fetchFunction, retryOptions);
};

/**
 * Make POST request with retry logic
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} config - Axios config object
 * @param {Object} retryOptions - Retry options (see fetchWithRetry)
 * @returns {Promise<Object>} - Axios response
 */
export const postWithRetry = async (url, data = {}, config = {}, retryOptions = {}) => {
  if (!url) {
    throw new Error('URL is required for POST request');
  }

  const fetchFunction = () => axios.post(url, data, {
    timeout: API_TIMEOUT_MS,
    ...config
  });

  return fetchWithRetry(fetchFunction, retryOptions);
};

/**
 * Handle API errors consistently
 * @param {Error} error - Error object
 * @param {string} context - Context/source of error (e.g., 'Vision API', 'iNaturalist')
 * @returns {Object} - Standardized error object
 */
export const handleApiError = (error, context = 'API') => {
  const errorDetails = {
    context,
    message: error.message || 'Unknown error',
    type: 'unknown',
    retryable: isRetryableError(error),
    timestamp: Date.now()
  };

  if (error.response) {
    // Server responded with error status
    errorDetails.type = 'server_error';
    errorDetails.status = error.response.status;
    errorDetails.statusText = error.response.statusText;
    errorDetails.data = error.response.data;
    
    console.error(`❌ ${context} Server Error [${error.response.status}]:`, error.response.data);
  } else if (error.request) {
    // Request made but no response
    errorDetails.type = 'network_error';
    console.error(`❌ ${context} Network Error:`, error.message);
  } else {
    // Error setting up request
    errorDetails.type = 'request_error';
    console.error(`❌ ${context} Request Error:`, error.message);
  }

  return errorDetails;
};

/**
 * Validate API response structure
 * @param {Object} response - API response
 * @param {string[]} requiredFields - Required fields in response.data
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
export const validateResponse = (response, requiredFields = []) => {
  if (!response || !response.data) {
    return { valid: false, missing: ['data'] };
  }

  const missing = [];
  
  for (const field of requiredFields) {
    // Support nested fields with dot notation (e.g., 'results.0.name')
    const fieldParts = field.split('.');
    let current = response.data;
    
    for (const part of fieldParts) {
      if (current === undefined || current === null) {
        missing.push(field);
        break;
      }
      current = current[part];
    }
    
    if (current === undefined || current === null) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Rate limiter for API calls
 * Prevents too many requests in a short time
 */
class RateLimiter {
  constructor(maxRequests = 10, timeWindowMs = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindowMs = timeWindowMs;
    this.requests = [];
  }

  /**
   * Check if request can proceed
   * @returns {Promise<void>} - Resolves when request can proceed
   */
  async acquire() {
    const now = Date.now();
    
    // Remove requests outside time window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindowMs
    );

    // If at limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire(); // Try again
      }
    }

    // Record this request
    this.requests.push(now);
  }

  /**
   * Reset rate limiter
   */
  reset() {
    this.requests = [];
  }
}

// Create default rate limiter instances
export const inaturalistRateLimiter = new RateLimiter(5, 1000); // 5 requests per second
export const visionApiRateLimiter = new RateLimiter(10, 1000); // 10 requests per second

/**
 * Batch multiple async requests with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} asyncFn - Async function to apply to each item
 * @param {number} concurrency - Maximum concurrent requests
 * @returns {Promise<Array>} - Results array
 */
export const batchProcess = async (items, asyncFn, concurrency = 3) => {
  const results = [];
  const executing = [];

  for (const item of items) {
    const promise = asyncFn(item).then(result => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
};

/**
 * Create abort controller with timeout
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Object} - { controller, signal, timeoutId }
 */
export const createAbortController = (timeoutMs = API_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    signal: controller.signal,
    timeoutId,
    cleanup: () => clearTimeout(timeoutId)
  };
};

export default {
  fetchWithRetry,
  getWithRetry,
  postWithRetry,
  handleApiError,
  validateResponse,
  RateLimiter,
  inaturalistRateLimiter,
  visionApiRateLimiter,
  batchProcess,
  createAbortController,
  isRetryableError
};