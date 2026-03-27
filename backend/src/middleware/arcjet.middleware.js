import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

export const arcjetMiddleware = async (req, res, next) => {
  try {
    const decision = await aj.protect(req, {
      // Add these options to be more friendly to mobile apps
      requested: 1,
    });

    if (decision.isDenied()) {
      // Allow common mobile user-agents and Expo clients
      const userAgent = req.headers["user-agent"] || "";
      
      if (decision.reason.isBot()) {
        // Be more lenient for mobile / React Native / Expo
        if (
          userAgent.includes("Expo") ||
          userAgent.includes("React Native") ||
          userAgent.includes("iOS") ||
          userAgent.includes("Android")
        ) {
          console.log("Mobile client detected, allowing request");
          return next();
        }

        return res.status(403).json({ 
          message: "Bot access denied." 
        });
      } 
      
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please try again later." 
        });
      }

      return res.status(403).json({
        message: "Access denied by security policy.",
      });
    }

    // Check for spoofed bots
    if (decision.results.some(isSpoofedBot)) {
      return res.status(403).json({
        error: "Spoofed bot detected",
        message: "Malicious bot activity detected.",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet Protection Error:", error);
    next(); // Fail open — important for development
  }
};