import { Router } from "express";

const router = Router();

// GET /health - Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

export default router;
