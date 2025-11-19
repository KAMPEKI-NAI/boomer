import express from 'express';
// Assuming the user runs in a Node.js environment, we use the @arcjet/node package
import arcjet, { tokenBucket, shield, detectBot } from "@arcjet/node";

// --- Mock Environment Setup ---
// In a real application, you would load these from a .env file or environment variables.
const ENV = {
  // Use a mock key for demonstration. Replace with your actual ARCJET_KEY.
  ARCJET_KEY: "ajk_0000000000000000000000000000000000000000000000000000000000000000",
};
const PORT = 3000;

// --- Arcjet Configuration (Based on User Input) ---

/**
 * Initializes Arcjet with security rules:
 * 1. Shield: Blocks common web attacks (SQLi, XSS).
 * 2. DetectBot: Blocks most bots, allowing only Search Engines, specific user agents (JAVA_OKHTTP),
 * and critically, Vercel's internal monitoring/screenshot bot.
 * 3. TokenBucket: Rate limits to 10 requests per 10 seconds (1 req/sec average, 15 req burst capacity).
 */
export const aj = arcjet({
  key: ENV.ARCJET_KEY,
  // We identify the user/client by their IP address for rate limiting
  characteristics: ["ip.src"],
  rules: [
    // 1. General attack protection
    shield({ mode: "LIVE" }),

    // 2. Bot detection and blocking
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
        "JAVA_OKHTTP",
        // --- FIX: Allow Vercel's internal monitor/screenshot bot ---
        "VERCEL_MONITOR_PREVIEW",
      ],
    }),

    // 3. Rate limiting (Token Bucket)
    tokenBucket({
      mode: "LIVE",
      refillRate: 10, // 10 tokens added every interval
      interval: 10,  // interval in seconds (10 seconds)
      capacity: 15,  // maximum tokens in bucket (burst capacity)
    }),
  ],
});

// --- Express Server Setup ---
const app = express();

/**
 * Arcjet Protection Middleware
 * This function wraps the Arcjet protection logic for a given route.
 */
const arcjetMiddleware = async (req, res, next) => {
  // 1. Extract necessary data from the request to pass to Arcjet
  // Note: For a real server, ensure you are getting the true client IP from proxy headers (e.g., 'x-forwarded-for')
  // We are now explicitly looking at the x-forwarded-for header provided in your log for better accuracy.
  const clientIp = req.get('x-forwarded-for')?.split(',')[0] || req.ip || '127.0.0.1';
  const userAgent = req.get('User-Agent') || '';

  console.log(`\nIncoming Request: IP=${clientIp}, User-Agent="${userAgent}"`);

  try {
    // 2. Execute all defined Arcjet rules
    const result = await aj.protect({
      // Use the client IP for rate limiting and general characteristics
      ip: clientIp,
      // Pass the user agent for the detectBot rule to inspect
      headers: {
        'User-Agent': userAgent,
      }
    });

    // 3. Check if any rule denied the request
    if (result.isDenied()) {
      // Log the denial reason (e.g., 'TOKEN_BUCKET', 'SHIELD', 'BOT_DETECTION')
      console.warn(`Request DENIED by Arcjet. Rule: ${result.deny.reason}, Metadata: ${JSON.stringify(result.deny.metadata)}`);

      // Determine the appropriate HTTP status code based on the denial reason
      let statusCode = 403; // Forbidden (Default for bot/shield)
      if (result.deny.reason === 'TOKEN_BUCKET') {
        // Use 429 Too Many Requests for rate limiting denials
        statusCode = 429;
      }

      // Respond to the client with the denial information
      return res.status(statusCode).json({
        message: `Request denied by security policy. Reason: ${result.deny.reason}`,
        code: statusCode,
        metadata: result.deny.metadata
      });
    }

    // 4. If not denied, proceed to the route handler
    console.log("Request ALLOWED by Arcjet.");
    next();

  } catch (error) {
    // Handle Arcjet API errors gracefully (e.g., network issues)
    console.error("Arcjet protection failed:", error);
    // Fail open: continue processing the request if the security check fails,
    // or fail closed: return an error, depending on your policy.
    next(); // Failing open in this example
  }
};

// --- Define the Protected Endpoint ---

app.get('/api/protected', arcjetMiddleware, (req, res) => {
  // This code only runs if Arcjet ALLOWED the request
  res.status(200).json({
    message: "Access granted! This endpoint is fully protected.",
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send(`Server running on port ${PORT}. Try accessing /api/protected.`);
});


// --- Start Server ---

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`\nTo test rate limiting, repeatedly hit http://localhost:${PORT}/api/protected`);
  console.log(`To test bot detection, try setting the User-Agent to a known crawler bot.`);
});