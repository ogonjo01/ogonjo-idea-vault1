import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const source = join(__dirname, '..', 'public', '_redirects');
const destination = join(__dirname, '..', 'dist', '_redirects');

if (existsSync(source)) {
  copyFileSync(source, destination);
  console.log('Copied _redirects to dist/');
}