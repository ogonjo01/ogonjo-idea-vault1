const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'public', '_redirects');
const destination = path.join(__dirname, '..', 'dist', '_redirects');

if (fs.existsSync(source)) {
  fs.copyFileSync(source, destination);
  console.log('Copied _redirects to dist/');
}