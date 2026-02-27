/**
 * Rate Limiter Middleware
 * Prevents API abuse by limiting requests per IP/user
 */

const rateStore = new Map(); // In-memory store (use Redis in production)

/**
 * Generic rate limiter
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} keyGenerator - Function to generate unique key (default: IP)
 */
function createRateLimiter(maxRequests = 100, windowMs = 60000, keyGenerator = null) {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Initialize or get request history for this key
    if (!rateStore.has(key)) {
      rateStore.set(key, []);
    }
    
    const requests = rateStore.get(key);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: retryAfter,
        message: `Please try again in ${retryAfter} seconds`
      });
    }
    
    // Record this request
    recentRequests.push(now);
    rateStore.set(key, recentRequests);
    
    // Set rate limit headers
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - recentRequests.length);
    res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    
    next();
  };
}

/**
 * API-wide rate limiter (100 requests per minute)
 */
const apiLimiter = createRateLimiter(100, 60000);

/**
 * Login rate limiter (10 requests per 15 minutes per IP)
 */
const loginLimiter = createRateLimiter(10, 15 * 60000);

/**
 * Password reset rate limiter (5 requests per hour per email)
 */
const passwordResetLimiter = (maxRequests = 5, windowMs = 60 * 60 * 1000) => {
  return (req, res, next) => {
    const email = req.body.email || req.query.email;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const key = `reset_${email}`;
    const now = Date.now();
    
    if (!rateStore.has(key)) {
      rateStore.set(key, []);
    }
    
    const requests = rateStore.get(key);
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return res.status(429).json({
        error: 'Too many password reset requests',
        retryAfter: retryAfter,
        message: `Please try again in ${Math.ceil(retryAfter / 60)} minutes`
      });
    }
    
    recentRequests.push(now);
    rateStore.set(key, recentRequests);
    
    next();
  };
};

/**
 * Cleanup old entries (run periodically to prevent memory leak)
 */
function cleanupRateStore() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [key, requests] of rateStore.entries()) {
    const activeRequests = requests.filter(time => now - time < maxAge);
    
    if (activeRequests.length === 0) {
      rateStore.delete(key);
    } else {
      rateStore.set(key, activeRequests);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupRateStore, 10 * 60 * 1000);

export {
  createRateLimiter,
  apiLimiter,
  loginLimiter,
  passwordResetLimiter,
  cleanupRateStore
};
