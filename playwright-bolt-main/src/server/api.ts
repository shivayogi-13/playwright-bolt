import express, { Request, Response } from 'express';
import { chromium, Cookie } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

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
  const { url } = req.body;
  console.log('=== Cookie Capture Request ===');
  console.log('Request received for URL:', url);

  if (!url) {
    console.log('Error: URL is missing');
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`Starting cookie capture for URL: ${url}`);
  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      args: [
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    console.log('Creating new browser context...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    console.log('Creating new page...');
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    try {
      console.log('Navigating to URL...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      console.log('Navigation completed');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn('Navigation warning:', error.message);
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
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
      console.log('Browser closed');
    }
  }
});

// 404 handler for undefined routes
router.use((req: Request, res: Response) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

export default router; 