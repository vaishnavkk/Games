import puppeteer from 'puppeteer-core';
import { launchOptions } from './chrome.js';

const origLaunch = puppeteer.launch.bind(puppeteer);
puppeteer.launch = function(options = {}) {
  const defaultOpts = launchOptions();
  const mergedArgs = Array.from(new Set([...(defaultOpts.args || []), ...(options.args || [])]));
  return origLaunch({
    ...options,
    ...defaultOpts,
    executablePath: defaultOpts.executablePath,
    args: mergedArgs
  });
};

await import('../validate/checkContrast.js');
