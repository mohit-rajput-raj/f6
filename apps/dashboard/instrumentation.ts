export async function register() {
  // Only run in Node.js runtime, not Edge Runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import('./lib/orpc.server')
  }
}