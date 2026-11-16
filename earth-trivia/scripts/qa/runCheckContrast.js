import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION in checkContrast:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION in checkContrast:', err);
});

const origLaunch = puppeteer.launch.bind(puppeteer);
puppeteer.launch = function(options = {}) {
  const defaultOpts = launchOptions();
  const mergedArgs = Array.from(new Set([
    ...(defaultOpts.args || []),
    ...(options.args || [])
  ]));
  return origLaunch({
    ...options,
    ...defaultOpts,
    executablePath: defaultOpts.executablePath,
    args: mergedArgs
  });
};

try {
  await import('../validate/checkContrast.js');
} catch (err) {
  console.error('checkContrast error:', err);
  process.exit(1);
}
