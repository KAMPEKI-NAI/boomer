import arcjet, { detectBot } from "@arcjet/node";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", 
        "JAVA_OKHTTP"],
    }),
  ],
});

export const arcjetMiddleware = async (req, res, next) => {
  try {
    const decision = await aj.protect(req);

    console.log("Arcjet decision:", decision.reason);

    if (decision.isDenied()) {
      return res.status(403).json({
        error: "Blocked by Arcjet",
        reason: decision.reason,
      });
    }

    next();
  } catch (err) {
    console.error("Arcjet error:", err);
    next(); // do not block if Arcjet fails
  }
};
