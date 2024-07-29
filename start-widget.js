const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const indexFile = path.join(publicDir, 'index.html');
const widgetFile = path.join(__dirname, 'widget.html');
const backupFile = path.join(publicDir, 'index.bak.html');

// Function to restore the original index.html
const restoreIndexHtml = () => {
  if (fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, indexFile);
    fs.unlinkSync(backupFile);
    console.log('Restored original index.html');
  }
};

// Copy widget.html to index.html and backup the original index.html
fs.copyFileSync(indexFile, backupFile);
fs.copyFileSync(widgetFile, indexFile);
console.log('Copied widget.html to index.html and backed up the original index.html');

// Start the development server with environment variables
const devServer = exec('react-app-rewired start', { env: process.env });

// Handle process termination and restore the original index.html
const handleExit = () => {
  restoreIndexHtml();
  devServer.kill();
  process.exit();
};

process.on('SIGINT', handleExit); // Handle Ctrl+C
process.on('SIGTERM', handleExit); // Handle kill commands
process.on('exit', handleExit); // Handle normal exit
