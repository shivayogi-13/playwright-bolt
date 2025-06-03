const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function captureCookies(url) {
    console.log('Launching browser...');
    const browser = await chromium.launch({ 
        headless: false,
        args: [
            '--disable-web-security',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    try {
        console.log('Creating new context...');
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        const page = await context.newPage();
        
        // Set longer timeout
        page.setDefaultTimeout(60000); // 60 seconds
        page.setDefaultNavigationTimeout(60000);

        console.log(`Navigating to ${url}...`);
        try {
            await page.goto(url, { 
                waitUntil: 'domcontentloaded', // Less strict than networkidle
                timeout: 60000 
            });
        } catch (navError) {
            console.warn('Navigation warning:', navError.message);
            // Continue anyway as we might still get cookies
        }

        // Wait for any potential redirects
        console.log('Waiting for potential redirects...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Get all cookies
        console.log('Capturing cookies...');
        const cookies = await context.cookies();
        
        if (cookies.length === 0) {
            console.log('No cookies found. Checking if page is accessible...');
            const content = await page.content();
            console.log('Page content length:', content.length);
        }
        
        // Save cookies to file
        const cookiesPath = path.join(__dirname, 'cookies.json');
        await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log(`Cookies saved to ${cookiesPath}`);

        // Print cookies to console
        console.log('\nCaptured Cookies:');
        if (cookies.length === 0) {
            console.log('No cookies were captured.');
        } else {
            cookies.forEach(cookie => {
                console.log(`${cookie.name}: ${cookie.value}`);
            });
        }

        // Take a screenshot for debugging
        const screenshotPath = path.join(__dirname, 'page.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to ${screenshotPath}`);

    } catch (error) {
        console.error('Error:', error);
        // Try to get cookies even if there was an error
        try {
            const cookies = await context.cookies();
            console.log('\nCookies captured despite error:');
            cookies.forEach(cookie => {
                console.log(`${cookie.name}: ${cookie.value}`);
            });
        } catch (e) {
            console.error('Failed to capture cookies after error:', e);
        }
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

// Get URL from command line argument or use default
const url = process.argv[2] || 'https://example.com';
console.log(`Starting cookie capture for: ${url}`);
captureCookies(url); 