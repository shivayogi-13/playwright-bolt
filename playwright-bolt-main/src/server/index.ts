import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRouter from './api';
import { chromium } from 'playwright';
import { getTempUserDataDir } from './utils';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin']
}));
app.use(express.json());

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, '../../dist/client')));

// API Routes
app.use('/api', apiRouter);

// Endpoint to capture cookies
app.post('/api/capture-cookies', async (req, res) => {
  const { url, username, password, usernameXPath, passwordXPath, mfaConfig, isInternalUser } = req.body;
  console.log('=== Cookie Capture Request ===');
  console.log('Request received for URL:', url);
  console.log('Username XPath:', usernameXPath);
  console.log('Password XPath:', passwordXPath);
  console.log('Is Internal User:', isInternalUser);

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
      console.log('Navigating to URL...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      console.log('Navigation completed');

      // Handle login if credentials are provided
      if (!isInternalUser && username && password && usernameXPath && passwordXPath) {
        console.log('Attempting login...');
        try {
          await page.fill(usernameXPath, username);
          await page.fill(passwordXPath, password);
          await page.keyboard.press('Enter');
          console.log('Login credentials entered');
        } catch (loginError) {
          console.warn('Login attempt warning:', loginError);
        }
      }

      // Handle MFA if configured
      if (mfaConfig) {
        console.log('MFA configuration detected, waiting for MFA screen...');
        try {
          await page.waitForSelector(mfaConfig.otpInputXPath, { timeout: 10000 });
          await page.fill(mfaConfig.otpInputXPath, mfaConfig.otpCode);
          await page.click(mfaConfig.verifyButtonXPath);
          console.log('MFA code entered and verified');
        } catch (mfaError) {
          console.warn('MFA attempt warning:', mfaError);
        }
      }

    } catch (error) {
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
    const allCookies = [...cookies];
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

  } catch (error) {
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

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 