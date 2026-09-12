import rateLimit from "express-rate-limit";

// Slows down credential-stuffing / brute-force attempts against login.
// Keyed by IP by default (express-rate-limit's default), which is enough
// for a single-instance deployment. In a horizontally-scaled production
// deployment this should be backed by a shared store (e.g.
// rate-limit-redis) so the limit is enforced across instances rather than
// reset per-process — noted here rather than silently assumed.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per window per IP
  standardHeaders: true, // sends RateLimit-* headers
  legacyHeaders: false,
  // Only failed attempts count against the limit, so a user who mistypes
  // their password a couple of times and then succeeds isn't penalized —
  // this targets brute-forcing, not normal fumbling.
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many login attempts. Please try again in a few minutes.",
      },
    });
  },
});