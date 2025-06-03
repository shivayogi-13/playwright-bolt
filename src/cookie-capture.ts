import { chromium } from 'playwright';

async function captureCookies(url: string) {
  console.log('=== Starting Cookie Capture ===');
  console.log('Target URL:', url);

  let browser;
  try {
    // Launch browser
    console.log('Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      args: [
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    // Create new context
    console.log('Creating new browser context...');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Create new page
    console.log('Creating new page...');
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    try {
      // Navigate to URL
      console.log('Navigating to URL...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      console.log('Navigation completed');
    } catch (error) {
      if (error instanceof Error) {
        console.warn('Navigation warning:', error.message);
      }
    }

    // Wait for potential redirects
    console.log('Waiting for potential redirects...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Capture cookies from browser context
    console.log('Capturing cookies from browser context...');
    const cookies = await context.cookies();
    console.log(`Found ${cookies.length} cookies from browser context:`, cookies.map(c => c.name));

    // Capture cookies from document.cookie
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

    // Convert cookies to a simple object format
    const cookieObject = allCookies.reduce((acc: { [key: string]: string }, cookie: any) => {
      acc[cookie.name] = cookie.value;
      return acc;
    }, {});

    // Save cookies to a file
    const fs = require('fs');
    fs.writeFileSync('captured-cookies.json', JSON.stringify(cookieObject, null, 2));
    console.log('Cookies saved to captured-cookies.json');

    return cookieObject;

  } catch (error) {
    console.error('=== Cookie Capture Error ===');
    console.error('Error during cookie capture:', error);
    throw error;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
      console.log('Browser closed');
    }
  }
}

// Example usage
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL as an argument');
    process.exit(1);
  }

  captureCookies(url)
    .then(cookies => {
      console.log('Cookies captured successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to capture cookies:', error);
      process.exit(1);
    });
}

export { captureCookies }; 