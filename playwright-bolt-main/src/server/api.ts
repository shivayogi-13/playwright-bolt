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
  try {
    const { url, username, password, usernameXPath, usernameNextXPath, passwordXPath, passwordNextXPath, isInternalUser, mfaConfig } = req.body;
    console.log('Received request with body:', { url, username, usernameXPath, usernameNextXPath, isInternalUser });

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Navigate to URL
      console.log('Step 1: Navigating to URL:', url);
      await page.goto(url, { waitUntil: 'networkidle' });
      console.log('Navigation complete');

      // Add clear toggle status message after navigation
      console.log('==========================================');
      console.log(`Toggle Status: ${isInternalUser ? 'INTERNAL USER' : 'EXTERNAL USER'} flow selected`);
      console.log('==========================================');

      if (isInternalUser) {
        // Internal user flow
        console.log('Starting internal user flow');
        
        // Step 2: Enter username
        if (username && usernameXPath) {
          console.log('Step 2: Starting username entry process');
          console.log('Username:', username);
          console.log('Username XPath:', usernameXPath);
          
          try {
            // Wait for username field to be visible and enabled with retry
            let usernameField;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
              try {
                console.log(`Attempt ${retryCount + 1} to find username field with XPath:`, usernameXPath);
                
                // First check if the page is loaded
                const pageState = await page.evaluate(() => document.readyState);
                console.log('Page ready state:', pageState);
                
                // Try to find the element using different methods
                try {
                  usernameField = await page.waitForSelector(usernameXPath, { 
                    state: 'visible', 
                    timeout: 10000 
                  });
                  console.log('Username field found using waitForSelector');
                } catch (selectorError) {
                  console.log('waitForSelector failed, trying evaluate:', selectorError);
                  // Try finding the element using evaluate
                  const elementExists = await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    return !!element;
                  }, usernameXPath);
                  console.log('Element exists check result:', elementExists);
                  
                  if (elementExists) {
                    usernameField = await page.$(usernameXPath);
                    console.log('Username field found using $ selector');
                  } else {
                    throw new Error('Username field not found in DOM');
                  }
                }
                
                if (usernameField) {
                  console.log('Username field found, performing checks...');
                  
                  // Check if element is visible
                  const isVisible = await usernameField.isVisible();
                  console.log('Username field visibility status:', isVisible);
                  
                  if (!isVisible) {
                    // Try to make it visible if it's not
                    await page.evaluate((xpath) => {
                      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                      if (element) {
                        (element as HTMLElement).style.display = 'block';
                        (element as HTMLElement).style.visibility = 'visible';
                        (element as HTMLElement).style.opacity = '1';
                      }
                    }, usernameXPath);
                    console.log('Attempted to make username field visible');
                  }

                  // Check if element is enabled
                  const isEnabled = await usernameField.isEnabled();
                  console.log('Username field enabled status:', isEnabled);

                  if (!isEnabled) {
                    // Try to enable the field if it's not
                    await page.evaluate((xpath) => {
                      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                      if (element) {
                        (element as HTMLElement).removeAttribute('disabled');
                        (element as HTMLElement).removeAttribute('readonly');
                      }
                    }, usernameXPath);
                    console.log('Attempted to enable username field');
                  }

                  // Get element properties for debugging
                  const elementInfo = await page.evaluate((xpath: string) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (element instanceof HTMLElement) {
                      return {
                        tagName: element.tagName,
                        type: element.getAttribute('type'),
                        id: element.id,
                        className: element.className,
                        disabled: element.hasAttribute('disabled'),
                        readonly: element.hasAttribute('readonly'),
                        style: element.style.cssText
                      };
                    }
                    return null;
                  }, usernameXPath);
                  console.log('Username field element info:', elementInfo);

                  // Try to focus the field first
                  try {
                    await usernameField.focus();
                    console.log('Username field focused successfully');
                  } catch (focusError) {
                    console.log('Focus failed, trying JavaScript focus:', focusError);
                    await page.evaluate((xpath: string) => {
                      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                      if (element instanceof HTMLElement) {
                        element.focus();
                      }
                    }, usernameXPath);
                    console.log('JavaScript focus executed');
                  }

                  // Clear the field
                  try {
                    await usernameField.fill('');
                    console.log('Username field cleared successfully');
                  } catch (clearError) {
                    console.log('Clear failed, trying JavaScript clear:', clearError);
                    await page.evaluate((xpath: string) => {
                      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                      if (element instanceof HTMLInputElement) {
                        element.value = '';
                      }
                    }, usernameXPath);
                    console.log('JavaScript clear executed');
                  }

                  // Type the username with a small delay between characters
                  try {
                    await usernameField.type(username, { delay: 100 });
                    console.log('Username typed successfully');
                  } catch (typeError) {
                    console.log('Type failed, trying JavaScript type:', typeError);
                    await page.evaluate(({ xpath, value }) => {
                      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                      if (element instanceof HTMLInputElement) {
                        element.value = value;
                        // Trigger events using a simpler approach
                        element.dispatchEvent(new Event('input'));
                        element.dispatchEvent(new Event('change'));
                      }
                    }, { xpath: usernameXPath, value: username });
                    console.log('JavaScript type executed');
                  }

                  // Verify the entered value
                  const enteredValue = await usernameField.inputValue();
                  console.log('Verified entered username value:', enteredValue);

                  if (enteredValue !== username) {
                    throw new Error(`Username value mismatch. Expected: ${username}, Got: ${enteredValue}`);
                  }

                  console.log('Step 2 completed successfully');
                  break; // Successfully entered username, exit retry loop
                }
              } catch (error) {
                console.log(`Attempt ${retryCount + 1} failed:`, error);
                retryCount++;
                
                if (retryCount === maxRetries) {
                  throw new Error(`Failed to enter username after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
                
                // Wait before retrying
                console.log('Waiting 1 second before retry...');
                await page.waitForTimeout(1000);
              }
            }

            // Step 3: Click next button
            if (usernameNextXPath) {
              console.log('Step 3: Attempting to click username next button');
              try {
                const nextButton = await page.waitForSelector(usernameNextXPath, { 
                  state: 'visible', 
                  timeout: 5000 
                });
                
                if (!nextButton) {
                  throw new Error('Next button not found');
                }

                const isNextEnabled = await nextButton.isEnabled();
                console.log('Next button found, enabled:', isNextEnabled);

                if (!isNextEnabled) {
                  throw new Error('Next button is not enabled');
                }

                // Try multiple click methods
                try {
                  await nextButton.click();
                  console.log('Standard click successful');
                } catch (clickError) {
                  console.log('Standard click failed, trying JavaScript click');
                  await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (element) {
                      (element as HTMLElement).click();
                    }
                  }, usernameNextXPath);
                  console.log('JavaScript click executed');
                }

                console.log('Next button clicked successfully');
                
                // Wait for navigation
                try {
                  await page.waitForNavigation({ timeout: 5000 });
                  console.log('Navigation completed after next button click');
                } catch (waitError) {
                  console.log('Navigation wait timed out, continuing...');
                }
              } catch (nextError: unknown) {
                console.error('Error clicking next button:', nextError);
                throw new Error(`Failed to click next button: ${nextError instanceof Error ? nextError.message : 'Unknown error'}`);
              }
            }

            // Step 4 & 5: Handle MFA
            if (mfaConfig?.otpInputXPath && mfaConfig?.verifyButtonXPath && mfaConfig?.otpCode) {
              console.log('Step 4: Attempting to enter OTP');
              try {
                const otpField = await page.waitForSelector(mfaConfig.otpInputXPath, { 
                  state: 'visible', 
                  timeout: 10000 
                });
                
                if (!otpField) {
                  throw new Error('OTP input field not found');
                }

                const isOtpEnabled = await otpField.isEnabled();
                console.log('OTP field found, enabled:', isOtpEnabled);

                if (!isOtpEnabled) {
                  throw new Error('OTP field is not enabled');
                }

                // Enter OTP
                await otpField.fill(mfaConfig.otpCode);
                console.log('OTP entered successfully');

                // Step 5: Click verify button
                console.log('Step 5: Attempting to click verify button');
                const verifyButton = await page.waitForSelector(mfaConfig.verifyButtonXPath, { 
                  state: 'visible', 
                  timeout: 5000 
                });
                
                if (!verifyButton) {
                  throw new Error('Verify button not found');
                }

                const isVerifyEnabled = await verifyButton.isEnabled();
                console.log('Verify button found, enabled:', isVerifyEnabled);

                if (!isVerifyEnabled) {
                  throw new Error('Verify button is not enabled');
                }

                // Try multiple click methods
                try {
                  await verifyButton.click();
                  console.log('Standard click successful on verify button');
                } catch (clickError) {
                  console.log('Standard click failed on verify button, trying JavaScript click');
                  await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (element) {
                      (element as HTMLElement).click();
                    }
                  }, mfaConfig.verifyButtonXPath);
                  console.log('JavaScript click executed on verify button');
                }

                console.log('Verify button clicked successfully');
                
                // Wait for navigation after MFA
                try {
                  await page.waitForNavigation({ timeout: 5000 });
                  console.log('Navigation completed after MFA verification');
                } catch (waitError) {
                  console.log('Navigation wait timed out after MFA, continuing...');
                }
              } catch (mfaError: unknown) {
                console.error('Error handling MFA:', mfaError);
                throw new Error(`Failed to handle MFA: ${mfaError instanceof Error ? mfaError.message : 'Unknown error'}`);
              }
            } else {
              console.log('MFA configuration not provided, skipping MFA steps');
            }
          } catch (usernameError: unknown) {
            console.error('Error in internal user flow:', usernameError);
            throw new Error(`Failed in internal user flow: ${usernameError instanceof Error ? usernameError.message : 'Unknown error'}`);
          }
        } else {
          throw new Error('Username or username XPath not provided for internal user flow');
        }
      } else {
        // External user flow
        // Only handle password for external users
        if (!password || !passwordXPath) {
          console.log('Skipping password handling - required fields missing for external user');
        } else {
          console.log('External user flow - attempting to fill password field');
          try {
            // Wait for password field to be visible and enabled
            const passwordField = await page.waitForSelector(passwordXPath, { state: 'visible', timeout: 10000 });
            const isEnabled = await passwordField.isEnabled();
            console.log('Password field found, enabled:', isEnabled);

            if (!isEnabled) {
              throw new Error('Password field is not enabled');
            }

            // Click the field first, then clear and type
            await passwordField.click();
            await passwordField.fill('');
            await passwordField.type(password, { delay: 100 });

            console.log('Password entered successfully');

            // Handle password next button if provided
            if (passwordNextXPath) {
              console.log('External user flow - attempting to click password next button');
              try {
                const nextButton = await page.waitForSelector(passwordNextXPath, { state: 'visible', timeout: 5000 });
                const isNextEnabled = await nextButton.isEnabled();
                console.log('Password next button found, enabled:', isNextEnabled);

                if (!isNextEnabled) {
                  throw new Error('Password next button is not enabled');
                }

                // Try multiple click methods
                try {
                  await nextButton.click();
                } catch (clickError) {
                  console.log('Standard click failed, trying JavaScript click');
                  await page.evaluate((xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (element) {
                      (element as HTMLElement).click();
                    }
                  }, passwordNextXPath);
                }

                console.log('Password next button clicked successfully');
                
                // Wait for navigation
                try {
                  await page.waitForNavigation({ timeout: 5000 });
                } catch (waitError) {
                  console.log('Navigation wait timed out after password, continuing...');
                }
              } catch (nextError: unknown) {
                console.error('Error clicking password next button:', nextError);
                throw new Error(`Failed to click password next button: ${nextError instanceof Error ? nextError.message : 'Unknown error'}`);
              }
            }
          } catch (passwordError: unknown) {
            console.error('Error handling password field:', passwordError);
            throw new Error(`Failed to handle password field: ${passwordError instanceof Error ? passwordError.message : 'Unknown error'}`);
          }
        }
      }

      // Get cookies
      const cookies = await context.cookies();
      console.log('Cookies captured:', cookies.length);

      await browser.close();
      res.json({ cookies });
    } catch (error: unknown) {
      console.error('Error during cookie capture:', error);
      await browser.close();
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  } catch (error: unknown) {
    console.error('Error in cookie capture endpoint:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 404 handler for undefined routes
router.use((req: Request, res: Response) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

export default router; 