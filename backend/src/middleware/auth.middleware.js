import { getAuth } from "@clerk/express";

export const protectRoute = (req, res, next) => {
  const auth = getAuth(req);

  console.log("🔐 AUTH DEBUG:", auth);

  if (!auth.userId) {
    console.log("❌ BLOCKED REQUEST — MISSING auth.userId");
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.userId = auth.userId;
  next();
};
