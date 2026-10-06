/* eslint-disable @typescript-eslint/no-require-imports */
// ==============================================================================
// Cosmos Nexus Innovations Frontend — High-Concurrency Multi-Core Cluster Runner
// Forks multiple Node.js worker processes across CPU cores for maximum throughput
// ==============================================================================

const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const numWorkers = Math.min(os.cpus()?.length || 2, 4);
  console.log(`[Next.js Cluster] Primary ${process.pid} online. Launching ${numWorkers} worker processes...`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`[Next.js Cluster] Worker ${worker.process.pid} exited (signal: ${signal || code}). Spawning replacement...`);
    cluster.fork();
  });
} else {
  // Worker process executes compiled Next.js standalone server
  require('./server.js');
}
