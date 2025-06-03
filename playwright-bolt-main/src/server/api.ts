import express, { Request, Response } from 'express';
import { chromium, Cookie } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';

const execAsync = promisify(exec);
const router = express.Router();

// Function to get temporary user data directory
const getTempUserDataDir = () => {
  const tempDir = join(homedir(), 'AppData', 'Local', 'Temp');
  return mkdtempSync(join(tempDir, 'playwright-'));
};

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  console.log('Health check requested');
  res.json({ status: 'ok', message: 'API server is running' });
});

// Endpoint to execute Playwright scripts
router.post('/execute-playwright', async (req: Request, res: Response) => {
  console.log('Received request to execute Playwright script');
  const { script } = req.body;

  if (!script) {
    console.error('No script provided in request');
    return res.status(400).json({ error: 'Script is required' });
  }

  try {
    console.log('Creating temporary script file');
    // Create a temporary file to store the script
    const tempScript = `
      const { chromium } = require('playwright');
      
      (async () => {
        console.log('Starting Playwright automation');
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          ${script}
        } catch (error) {
          console.error('Error in Playwright script:', error);
          process.exit(1);
        } finally {
          await browser.close();
        }
      })();
    `;

    console.log('Executing Playwright script');
    // Execute the script
    await execAsync(`node -e "${tempScript}"`);
    
    console.log('Playwright script executed successfully');
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Error executing Playwright script:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

// Endpoint to get cookies from a URL
router.post('/get-cookies', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const cookies = await context.cookies();
      res.json({ cookies });
    } finally {
      await browser.close();
    }
  } catch (error: unknown) {
    console.error('Error getting cookies:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
});

// Endpoint to capture cookies from a URL
router.post('/capture-cookies', async (req: Request, res: Response) => {
  const { url, username, password, usernameXPath, passwordXPath, mfaConfig } = req.body;
  console.log('=== Cookie Capture Request ===');
  console.log('Request received for URL:', url);
  console.log('Username XPath:', usernameXPath);
  console.log('Password XPath:', passwordXPath);

  if (!url) {
    console.log('Error: URL is missing');
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`Starting cookie capture for URL: ${url}`);
  let context;
  try {
    const userDataDir = getTempUserDataDir();
    console.log('Using temporary user data directory:', userDataDir);
    
    console.log('Launching browser with persistent context...');
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--remote-debugging-port=9222',
        '--remote-allow-origins=*'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });
    
    console.log('Creating new page...');
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    try {
      console.log('Navigating to URL:', url);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      console.log('Navigation completed');

      // Handle login if username and password are provided
      if (username && password && usernameXPath && passwordXPath) {
        console.log('Attempting to fill login form...');
        
        try {
          // Wait for username field using XPath
          console.log('Waiting for username field with XPath:', usernameXPath);
          const usernameField = await page.waitForSelector(`xpath=${usernameXPath}`, { timeout: 10000 });
          if (!usernameField) {
            throw new Error('Username field not found with XPath: ' + usernameXPath);
          }
          console.log('Username field found, entering username...');
          await usernameField.fill(username);
          
          // Wait for password field using XPath
          console.log('Waiting for password field with XPath:', passwordXPath);
          const passwordField = await page.waitForSelector(`xpath=${passwordXPath}`, { timeout: 10000 });
          if (!passwordField) {
            throw new Error('Password field not found with XPath: ' + passwordXPath);
          }
          console.log('Password field found, entering password...');
          await passwordField.fill(password);
          
          // Try to find and click the login button
          console.log('Looking for login button...');
          const loginButtonFound = await page.evaluate((pwdXPath) => {
            try {
              const pwdField = document.evaluate(pwdXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement;
              if (!pwdField) {
                console.log('Password field not found');
                return false;
              }

              // Try to find the next button or input[type="submit"] after the password field
              const nextElement = pwdField.nextElementSibling as HTMLElement;
              if (nextElement && (nextElement.tagName === 'BUTTON' || 
                  (nextElement.tagName === 'INPUT' && nextElement.getAttribute('type') === 'submit'))) {
                console.log('Found submit button after password field');
                return true;
              }

              // Look for a form and its submit button
              const form = pwdField.closest('form');
              if (form) {
                const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitButton) {
                  console.log('Found submit button in form');
                  return true;
                }
              }

              console.log('No submit button found');
              return false;
            } catch (error) {
              console.error('Error finding login button:', error);
              return false;
            }
          }, passwordXPath);

          if (loginButtonFound) {
            console.log('Login button found, clicking...');
            await page.keyboard.press('Enter');
          } else {
            console.log('No login button found, waiting for manual login...');
          }
        } catch (error) {
          console.error('Error during login form filling:', error);
          throw new Error(`Failed to fill login form: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Handle MFA if configured
      if (mfaConfig && mfaConfig.otpInputXPath && mfaConfig.verifyButtonXPath && mfaConfig.otpCode) {
        console.log('MFA configuration detected, waiting for MFA screen...');
        
        try {
          // Wait for MFA input field using XPath
          console.log('Waiting for MFA input field with XPath:', mfaConfig.otpInputXPath);
          const mfaInputField = await page.waitForSelector(`xpath=${mfaConfig.otpInputXPath}`, { timeout: 10000 });
          if (!mfaInputField) {
            throw new Error('MFA input field not found with XPath: ' + mfaConfig.otpInputXPath);
          }
          console.log('MFA input field found, entering code...');
          
          // Clear any existing value and enter MFA code
          await mfaInputField.fill('');
          await mfaInputField.fill(mfaConfig.otpCode);
          
          // Wait for verify button using XPath and click it
          console.log('Waiting for verify button with XPath:', mfaConfig.verifyButtonXPath);
          const verifyButton = await page.waitForSelector(`xpath=${mfaConfig.verifyButtonXPath}`, { timeout: 10000 });
          if (!verifyButton) {
            throw new Error('Verify button not found with XPath: ' + mfaConfig.verifyButtonXPath);
          }
          console.log('Verify button found, clicking...');
          await verifyButton.click();
        } catch (error) {
          console.error('Error during MFA handling:', error);
          throw new Error(`Failed to handle MFA: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn('Navigation or login warning:', error.message);
      }
    }

    console.log('Waiting for potential redirects...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Capturing cookies from browser context...');
    const cookies = await context.cookies();
    console.log(`Found ${cookies.length} cookies from browser context:`, cookies.map(c => c.name));

    console.log('Capturing cookies from document.cookie...');
    const documentCookies = await page.evaluate(() => {
      return document.cookie.split(';').map((cookie: string) => {
        const [name, value] = cookie.trim().split('=');
        return { name, value };
      });
    });
    console.log(`Found ${documentCookies.length} cookies from document.cookie:`, documentCookies.map(c => c.name));

    // Combine both cookie sources
    console.log('Combining cookie sources...');
    const allCookies: Cookie[] = [...cookies];
    documentCookies.forEach((docCookie: { name: string; value: string }) => {
      if (!allCookies.some(c => c.name === docCookie.name)) {
        console.log(`Adding document cookie: ${docCookie.name}`);
        allCookies.push({
          name: docCookie.name,
          value: docCookie.value,
          domain: new URL(url).hostname,
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax'
        });
      }
    });

    console.log(`Total cookies captured: ${allCookies.length}`);
    console.log('Cookie names:', allCookies.map(c => c.name));
    console.log('=== Cookie Capture Complete ===');

    res.json({ cookies: allCookies });

  } catch (error: unknown) {
    console.error('=== Cookie Capture Error ===');
    console.error('Error during cookie capture:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  } finally {
    if (context) {
      console.log('Closing browser context...');
      await context.close();
      console.log('Browser context closed');
    }
  }
});

// 404 handler for undefined routes
router.use((req: Request, res: Response) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

export default router; 