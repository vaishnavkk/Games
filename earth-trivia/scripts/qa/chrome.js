import fs from 'fs';
import path from 'path';

export function getChromeExecutablePath() {
  const envPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const platform = process.platform;
  const candidates = [];

  if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    );
    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'));
    }
    if (process.env.PROGRAMFILES) {
      candidates.push(path.join(process.env.PROGRAMFILES, 'Google\\Chrome\\Application\\chrome.exe'));
    }
    if (process.env['PROGRAMFILES(X86)']) {
      candidates.push(path.join(process.env['PROGRAMFILES(X86)'], 'Google\\Chrome\\Application\\chrome.exe'));
    }
  } else if (platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    );
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  if (envPath) {
    return envPath;
  }

  throw new Error('Set CHROME_PATH');
}

export function launchOptions(customOptions = {}) {
  const executablePath = getChromeExecutablePath();
  const baseArgs = [];
  if (process.env.CI) {
    baseArgs.push(
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    );
  }

  if (Array.isArray(customOptions)) {
    return {
      executablePath,
      headless: true,
      args: Array.from(new Set([...baseArgs, ...customOptions]))
    };
  }

  const customArgs = customOptions.args || [];
  const mergedArgs = Array.from(new Set([...baseArgs, ...customArgs]));

  return {
    executablePath,
    headless: true,
    ...customOptions,
    args: mergedArgs
  };
}

export default {
  getChromeExecutablePath,
  launchOptions
};
