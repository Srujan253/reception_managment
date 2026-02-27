/**
 * HTTPS/SSL Configuration Guide
 * Instructions for enabling HTTPS in development and production
 */

/**
 * DEVELOPMENT SETUP (Self-signed certificate)
 * 
 * 1. Generate self-signed certificate:
 *    openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
 * 
 * 2. In server.js, add:
 *    const https = require('https');
 *    const fs = require('fs');
 *    const options = {
 *      key: fs.readFileSync('./certs/key.pem'),
 *      cert: fs.readFileSync('./certs/cert.pem')
 *    };
 *    https.createServer(options, app).listen(PORT, () => { ... });
 * 
 * 3. Access via: https://localhost:3001
 *    (Ignore browser SSL warning in development)
 */

/**
 * PRODUCTION SETUP (Let's Encrypt)
 * 
 * 1. Install Certbot:
 *    sudo apt-get install certbot python3-certbot-nginx (for Nginx)
 *    sudo apt-get install certbot python3-certbot-apache (for Apache)
 * 
 * 2. Create certificate:
 *    sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
 * 
 * 3. Certificates are stored in:
 *    /etc/letsencrypt/live/yourdomain.com/
 * 
 * 4. In ENV:
 *    NODE_ENV=production
 *    SSL_KEY=/etc/letsencrypt/live/yourdomain.com/privkey.pem
 *    SSL_CERT=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
 * 
 * 5. Auto-renew:
 *    sudo certbot renew --dry-run
 *    (Set cron: 0 0 1 * * sudo certbot renew --quiet)
 */

/**
 * Middleware to enforce HTTPS
 */
function enforceHttps(req, res, next) {
  // Skip HTTPS enforcement in development
  if (process.env.NODE_ENV === 'development') return next();
  
  // Check if connection is secure
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  
  next();
}

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  // Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy (CSP)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' cdn.jsdelivr.net; connect-src 'self' https:;"
  );
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options (prevent clickjacking)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

/**
 * Create HTTPS server with cert files
 */
function createSecureServer(app, port) {
  const https = require('https');
  const fs = require('fs');
  const path = require('path');
  
  if (process.env.NODE_ENV === 'production') {
    // Production: Use Let's Encrypt certificates
    const keyPath = process.env.SSL_KEY || '/etc/letsencrypt/live/yourdomain.com/privkey.pem';
    const certPath = process.env.SSL_CERT || '/etc/letsencrypt/live/yourdomain.com/fullchain.pem';
    
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.error('❌ SSL certificates not found. Set SSL_KEY and SSL_CERT environment variables.');
      process.exit(1);
    }
    
    const options = {
      key: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8')
    };
    
    return https.createServer(options, app);
  } else {
    // Development: Use self-signed certificate or skip HTTPS
    const keyPath = path.join(__dirname, '../certs/key.pem');
    const certPath = path.join(__dirname, '../certs/cert.pem');
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const options = {
        key: fs.readFileSync(keyPath, 'utf8'),
        cert: fs.readFileSync(certPath, 'utf8')
      };
      
      console.log('🔒 HTTPS enabled with self-signed certificate');
      return https.createServer(options, app);
    } else {
      console.log('⚠️  HTTPS disabled in development. Run: openssl req -x509 -newkey rsa:4096 -nodes -out certs/cert.pem -keyout certs/key.pem -days 365');
      return null;
    }
  }
}

module.exports = {
  enforceHttps,
  securityHeaders,
  createSecureServer
};
