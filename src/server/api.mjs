import express from 'express';
import { chromium } from 'playwright';

const router = express.Router();

router.post('/capture-cookies', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Starting cookie capture for URL: ${url}`);
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: false,
            args: [
                '--disable-web-security',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        const page = await context.newPage();
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        try {
            await page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
        } catch (navError) {
            console.warn('Navigation warning:', navError.message);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));

        const cookies = await context.cookies();
        console.log(`Found ${cookies.length} cookies:`, cookies.map(c => c.name));

        // Try to get cookies from document.cookie as well
        const documentCookies = await page.evaluate(() => {
            return document.cookie.split(';').map(cookie => {
                const [name, value] = cookie.trim().split('=');
                return { name, value };
            });
        });

        // Combine both cookie sources
        const allCookies = [...cookies];
        documentCookies.forEach(docCookie => {
            if (!allCookies.some(c => c.name === docCookie.name)) {
                allCookies.push({
                    name: docCookie.name,
                    value: docCookie.value,
                    domain: new URL(url).hostname
                });
            }
        });

        res.json({ cookies: allCookies });

    } catch (error) {
        console.error('Error during cookie capture:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

export default router; 