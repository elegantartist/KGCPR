const { spawn } = require('child_process');
const path = require('path');

console.log('Starting KGCPR Integrated Server...');

// Start the integrated server directly using npm start
const serverProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, 'server'),
  env: { ...process.env, PORT: process.env.PORT || '5000' }
});

function shutdown() {
  console.log('\nShutting down KGCPR Integrated Server...');
  serverProcess.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

serverProcess.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});