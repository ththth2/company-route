import { execFileSync } from 'node:child_process';
const staged = process.argv.includes('--staged');
const names = execFileSync('git', staged ? ['diff','--cached','--name-only','--diff-filter=ACMR','-z'] : ['ls-files','-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
const keyPattern = new RegExp('AI' + 'za[0-9A-Za-z_-]{35}');
let failed = false;
for (const name of names) {
  const base = name.split('/').at(-1);
  const envFile = (base === '.env' || base.startsWith('.env.')) && base !== '.env.example';
  const contents = execFileSync('git', ['show', ':' + name], {maxBuffer:20*1024*1024});
  if (envFile || keyPattern.test(contents.toString('utf8'))) {
    console.error('Blocked: environment file or Google API key in ' + name);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('Secret check passed.');
