// No-op stand-in for the "server-only" package when running verification
// scripts directly under Node (outside Next.js's bundler, where the real
// server-only guard would throw).
export {};
