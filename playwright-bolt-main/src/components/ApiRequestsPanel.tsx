import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Collapse,
  TableSortLabel,
  useTheme,
  SelectChangeEvent,
  Tabs,
  Tab,
  InputAdornment,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  DragIndicator as DragIndicatorIcon,
  Download as DownloadIcon,
  UploadFile as UploadFileIcon,
  Stop as StopIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';
import { TOTP } from 'otpauth';

// Add Chrome type definitions at the top of the file
declare namespace chrome {
  namespace cookies {
    interface Cookie {
      name: string;
      value: string;
      domain: string;
      path: string;
      secure: boolean;
      httpOnly: boolean;
      expirationDate?: number;
    }

    function getAll(details: { url?: string; domain?: string; name?: string; path?: string; secure?: boolean; session?: boolean }): Promise<Cookie[]>;
  }
}

interface ApiRequest {
  id: string;
  name: string;
  method: string;
  endpoint: string;
  headers: { key: string; value: string }[];
  body: string;
  expectedStatus: number;
  suite: string;
  environment: string;
  assertions: Assertion[];
  responseVariable?: string;
  cookieVariable?: string;
  cookieCaptureUrl?: string;
  capturedCookies?: { [key: string]: string };
  loginUrl?: string;
  username?: string;
  password?: string;
  tags: string[];
}

interface Assertion {
  id: string;
  type: 'status' | 'body' | 'header';
  path: string;
  operator: string;
  value: string;
  validationType: 'value' | 'schema';
  schema: string;
  keyValuePairs: { key: string; value: string }[];
}

interface Environment {
  name: string;
  baseUrl: string;
  parameters: { [key: string]: string };
}

interface NetworkRequest {
  id: string;
  name: string;
  method: string;
  endpoint: string;
  headers: { key: string; value: string }[];
  body: string;
  response: string;
  status: number;
  timestamp: number;
}

interface Configuration {
  cookieCaptureUrl?: string;
  capturedCookies?: { [key: string]: string };
  loginUrl?: string;
  username?: string;
  password?: string;
}

interface MFAConfig {
  otpInputXPath: string;
  verifyButtonXPath: string;
  otpCode: string;
  usernameXPath: string;
  usernameNextXPath: string;
  passwordXPath: string;
  passwordNextXPath: string;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

const defaultApiRequest: ApiRequest = {
  id: '',
  name: '',
  method: 'GET',
  endpoint: '',
  headers: [],
  body: '',
  expectedStatus: 200,
  suite: '',
  environment: '',
  assertions: [],
  tags: []
};

const STORAGE_KEYS = {
  API_REQUESTS: 'test_automation_api_requests',
  ENVIRONMENTS: 'test_automation_environments',
  SELECTED_ENVIRONMENT: 'test_automation_selected_environment'
};

export const TEST_SUITES = {
  SMOKE: 'smoke',
  REGRESSION: 'regression',
  SANITY: 'sanity',
  PERFORMANCE: 'performance',
};

interface ExpandedState {
  [key: number]: boolean;
}

interface ConfigurationTabProps {
  config: ApiRequest;
  onConfigChange: (config: ApiRequest) => void;
}

const ConfigurationTab: React.FC<ConfigurationTabProps> = ({ config, onConfigChange }) => {
  const [loginUrl, setLoginUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isInternalUser, setIsInternalUser] = useState(false);
  const [mfaConfig, setMfaConfig] = useState<MFAConfig>({
    otpInputXPath: '',
    verifyButtonXPath: '',
    otpCode: '',
    usernameXPath: '',
    usernameNextXPath: '',
    passwordXPath: '',
    passwordNextXPath: ''
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedCookies, setCapturedCookies] = useState<chrome.cookies.Cookie[]>([]);
  const [cookieWindow, setCookieWindow] = useState<Window | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const [storedCookies, setStoredCookies] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentTotpCode, setCurrentTotpCode] = useState('');
  const [lastGenerated, setLastGenerated] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(30);
  const [showTotpCode, setShowTotpCode] = useState(false);
  const [showMfaCode, setShowMfaCode] = useState(false);

  // Add useEffect to load saved cookies
  useEffect(() => {
    const loadSavedCookies = async () => {
      try {
        // Load cookies from localStorage instead of chrome.cookies
        const savedCookies = localStorage.getItem('capturedCookies');
        if (savedCookies) {
          setCapturedCookies(JSON.parse(savedCookies));
        }
      } catch (error) {
        console.error('Error loading cookies:', error);
      }
    };
    loadSavedCookies();
  }, []);

  // Add useEffect to load stored cookies
  useEffect(() => {
    const loadStoredCookies = async () => {
      try {
        // Load stored cookies from localStorage
        const savedStoredCookies = localStorage.getItem('storedCookies');
        if (savedStoredCookies) {
          const parsedCookies = JSON.parse(savedStoredCookies);
          setStoredCookies(parsedCookies);
        }
      } catch (error) {
        console.error('Error loading stored cookies:', error);
      }
    };
    loadStoredCookies();
  }, []);

  // Add useEffect for TOTP code generation
  useEffect(() => {
    const generateTotpCode = () => {
      if (mfaConfig.otpCode) {
        try {
          const totp = new TOTP({
            secret: mfaConfig.otpCode,
            period: 30
          });
          const code = totp.generate();
          setCurrentTotpCode(code);
          setLastGenerated(Date.now());
          setRemainingTime(30);
        } catch (error) {
          console.error('Error generating TOTP code:', error);
          enqueueSnackbar('Error generating TOTP code', { variant: 'error' });
        }
      }
    };

    generateTotpCode();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastGenerated) / 1000);
      const newRemainingTime = Math.max(0, 30 - elapsed);
      setRemainingTime(newRemainingTime);

      if (newRemainingTime === 0) {
        generateTotpCode();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mfaConfig.otpCode, lastGenerated]);

  // Update the startCookieCapture function
  const startCookieCapture = async () => {
    if (!loginUrl) {
      alert('Please enter a login URL');
      return;
    }

    setIsCapturing(true);
    try {
      const requestBody = {
        url: loginUrl,
        isInternalUser,
        ...(isInternalUser ? {
          username,
          usernameXPath: mfaConfig.usernameXPath,
          usernameNextXPath: mfaConfig.usernameNextXPath
        } : {
          username,
          password,
          usernameXPath: mfaConfig.usernameXPath,
          usernameNextXPath: mfaConfig.usernameNextXPath,
          passwordXPath: mfaConfig.passwordXPath,
          passwordNextXPath: mfaConfig.passwordNextXPath
        }),
        mfaConfig: mfaConfig.otpInputXPath && mfaConfig.verifyButtonXPath && mfaConfig.otpCode ? {
          otpInputXPath: mfaConfig.otpInputXPath,
          verifyButtonXPath: mfaConfig.verifyButtonXPath,
          otpCode: mfaConfig.otpCode
        } : undefined
      };

      console.log('Sending request to capture cookies with body:', requestBody);

      const response = await fetch('http://localhost:3003/api/capture-cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received response:', data);
      
      if (data.cookies) {
        setCapturedCookies(data.cookies);
        // Save to localStorage
        const savedConfig = localStorage.getItem('mfaConfig');
        const parsedConfig = savedConfig ? JSON.parse(savedConfig) : {};
        localStorage.setItem('mfaConfig', JSON.stringify({
          ...parsedConfig,
          capturedCookies: data.cookies
        }));
        enqueueSnackbar('Cookies captured successfully', { variant: 'success' });
      } else {
        throw new Error('No cookies received from server');
      }
    } catch (error) {
      console.error('Error capturing cookies:', error);
      enqueueSnackbar('Error capturing cookies: ' + (error instanceof Error ? error.message : 'Unknown error'), { variant: 'error' });
    } finally {
      setIsCapturing(false);
    }
  };

  const injectCookieCaptureScript = (targetWindow: Window) => {
    try {
      const script = `
        (function() {
          // Function to check if we're on the MFA screen
          function isOnMfaScreen() {
            const mfaField = document.evaluate(
              '${mfaConfig.otpInputXPath}',
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
            return !!mfaField;
          }

          // Function to handle MFA verification with delay
          function handleMfaVerification() {
            setTimeout(() => {
              const mfaField = document.evaluate(
                '${mfaConfig.otpInputXPath}',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              ).singleNodeValue;
              
              const verifyButton = document.evaluate(
                '${mfaConfig.verifyButtonXPath}',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              ).singleNodeValue;

              if (mfaField && verifyButton) {
                // Clear any existing value
                mfaField.value = '';
                // Trigger input event
                mfaField.dispatchEvent(new Event('input', { bubbles: true }));
                // Add delay before setting value
                setTimeout(() => {
                  mfaField.value = '${mfaConfig.otpCode}';
                  mfaField.dispatchEvent(new Event('input', { bubbles: true }));
                  mfaField.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  // Add delay before clicking verify button
                  setTimeout(() => {
                    verifyButton.click();
                    // Capture cookies after verification
                    setTimeout(captureCookies, 2000);
                  }, 1000);
                }, 500);
              }
            }, 2000);
          }

          // Function to capture cookies
          function captureCookies() {
            const cookies = document.cookie.split(';').map(cookie => {
              const [name, value] = cookie.trim().split('=');
              return { name, value, domain: window.location.hostname, path: '/' };
            });
            window.opener.postMessage({
              type: 'COOKIES_CAPTURED',
              cookies: cookies
            }, '*');
          }

          // Check for MFA screen
          if (isOnMfaScreen()) {
            window.opener.postMessage({ type: 'MFA_SCREEN_DETECTED' }, '*');
          }

          // Capture cookies when the page loads
          captureCookies();
        })();
      `;

      const scriptElement = targetWindow.document.createElement('script');
      scriptElement.textContent = script;
      targetWindow.document.head.appendChild(scriptElement);
      targetWindow.document.head.removeChild(scriptElement);
    } catch (error) {
      console.error('Error injecting script:', error);
      enqueueSnackbar('Error injecting script', { variant: 'error' });
    }
  };

  const handleMFAVerification = (targetWindow: Window) => {
    try {
      const script = `
        (function() {
          // Function to check if we're on the MFA screen
          function isOnMfaScreen() {
            try {
              const mfaField = document.evaluate(
                '${mfaConfig.otpInputXPath}',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              ).singleNodeValue;
              
              if (!mfaField) {
                console.error('OTP input field not found with XPath:', '${mfaConfig.otpInputXPath}');
                window.opener.postMessage({ 
                  type: 'MFA_ERROR', 
                  error: 'OTP input field not found' 
                }, '*');
                return false;
              }
              return true;
            } catch (error) {
              console.error('Error checking MFA screen:', error);
              window.opener.postMessage({ 
                type: 'MFA_ERROR', 
                error: 'Error checking MFA screen: ' + error.message 
              }, '*');
              return false;
            }
          }

          // Function to handle MFA verification with delay
          function handleMfaVerification() {
            setTimeout(() => {
              try {
                const mfaField = document.evaluate(
                  '${mfaConfig.otpInputXPath}',
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue;
                
                const verifyButton = document.evaluate(
                  '${mfaConfig.verifyButtonXPath}',
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue;

                if (!mfaField) {
                  console.error('OTP input field not found');
                  window.opener.postMessage({ 
                    type: 'MFA_ERROR', 
                    error: 'OTP input field not found' 
                  }, '*');
                  return;
                }

                if (!verifyButton) {
                  console.error('Verify button not found');
                  window.opener.postMessage({ 
                    type: 'MFA_ERROR', 
                    error: 'Verify button not found' 
                  }, '*');
                  return;
                }

                // Clear any existing value
                mfaField.value = '';
                // Trigger input event
                mfaField.dispatchEvent(new Event('input', { bubbles: true }));
                // Add delay before setting value
                setTimeout(() => {
                  // Set the TOTP code value
                  mfaField.value = '${currentTotpCode}';
                  mfaField.dispatchEvent(new Event('input', { bubbles: true }));
                  mfaField.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  // Add delay before clicking verify button
                  setTimeout(() => {
                    verifyButton.click();
                    // Capture cookies after verification
                    setTimeout(() => {
                      const cookies = document.cookie.split(';').map(cookie => {
                        const [name, value] = cookie.trim().split('=');
                        return { name, value, domain: window.location.hostname, path: '/' };
                      });
                      window.opener.postMessage({
                        type: 'COOKIES_CAPTURED',
                        cookies: cookies
                      }, '*');
                    }, 2000);
                  }, 1000);
                }, 500);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                console.error('Error in MFA verification:', error);
                enqueueSnackbar('Error in MFA verification: ' + errorMessage, { variant: 'error' });
              }
            }, 2000);
          }

          // Check for MFA screen and handle verification
          if (isOnMfaScreen()) {
            window.opener.postMessage({ type: 'MFA_SCREEN_DETECTED' }, '*');
            handleMfaVerification();
          }

          // Set up a mutation observer to detect when the MFA screen appears
          const observer = new MutationObserver((mutations) => {
            if (isOnMfaScreen()) {
              window.opener.postMessage({ type: 'MFA_SCREEN_DETECTED' }, '*');
              handleMfaVerification();
              observer.disconnect();
            }
          });

          // Start observing the document with the configured parameters
          observer.observe(document.body, { childList: true, subtree: true });

          // Capture cookies when the page loads
          const cookies = document.cookie.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            return { name, value, domain: window.location.hostname, path: '/' };
          });
          window.opener.postMessage({
            type: 'COOKIES_CAPTURED',
            cookies: cookies
          }, '*');
        })();
      `;

      const scriptElement = targetWindow.document.createElement('script');
      scriptElement.textContent = script;
      targetWindow.document.head.appendChild(scriptElement);
      targetWindow.document.head.removeChild(scriptElement);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error handling MFA verification:', error);
      enqueueSnackbar('Error handling MFA verification: ' + errorMessage, { variant: 'error' });
    }
  };

  const stopCookieCapture = () => {
    setIsCapturing(false);
    if (cookieWindow) {
      try {
        // Check if the window is still accessible
        if (!cookieWindow.closed) {
          cookieWindow.close();
        }
      } catch (error) {
        console.error('Error closing window:', error);
      }
    }
    setCookieWindow(null);
  };

  // Add new function to fetch cookies from the opened tab
  const fetchCookiesFromTab = async (): Promise<Cookie[]> => {
    console.log('=== Starting Cookie Capture from Capture Cookies Button ===');
    try {
      if (!loginUrl) {
        console.log('Error: No login URL provided');
        enqueueSnackbar('Please enter the login URL first', { variant: 'error' });
        return [];
      }

      console.log('Sending request to capture cookies...');
      enqueueSnackbar('Starting cookie capture...', { variant: 'info' });
      
      const response = await fetch('http://localhost:3003/api/capture-cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: loginUrl })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || 'Failed to capture cookies');
      }

      const data = await response.json();
      console.log('Received cookies from server:', data.cookies);
      
      // Convert cookies array to object format
      const cookieObject = data.cookies.reduce((acc: { [key: string]: string }, cookie: any) => {
        acc[cookie.name] = cookie.value;
        return acc;
      }, {});
      console.log('Converted cookies to object format:', cookieObject);

      // Update stored cookies
      console.log('Updating stored cookies state...');
      setStoredCookies(cookieObject);
      
      // Save to localStorage
      console.log('Saving cookies to localStorage...');
      localStorage.setItem('storedCookies', JSON.stringify(cookieObject));
      
      // Update config with captured cookies
      console.log('Updating configuration with captured cookies...');
      onConfigChange({
        ...config,
        capturedCookies: cookieObject
      });

      console.log('=== Cookie Capture Complete ===');
      enqueueSnackbar('Cookies captured successfully', { variant: 'success' });
      return data.cookies;

    } catch (error: any) {
      console.error('=== Cookie Capture Error ===');
      console.error('Error capturing cookies:', error);
      enqueueSnackbar(`Error capturing cookies: ${error.message}`, { variant: 'error' });
      return [];
    }
  };

  // Add save configuration function
  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      
      // Update the config with current values
      const updatedConfig = {
        ...config,
        loginUrl,
        username,
        password,
        mfaConfig,
        capturedCookies: storedCookies,
        isInternalUser
      };

      // Save to localStorage
      localStorage.setItem('apiRequestConfig', JSON.stringify(updatedConfig));
      
      // Update parent component
      onConfigChange(updatedConfig);
      
      enqueueSnackbar('Configuration saved successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error saving configuration:', error);
      enqueueSnackbar('Error saving configuration', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Add useEffect to load saved configuration
  useEffect(() => {
    const loadSavedConfiguration = () => {
      try {
        const savedConfig = localStorage.getItem('apiRequestConfig');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setLoginUrl(parsedConfig.loginUrl || '');
          setUsername(parsedConfig.username || '');
          setPassword(parsedConfig.password || '');
          setIsInternalUser(parsedConfig.isInternalUser || false);
          setMfaConfig(parsedConfig.mfaConfig || {
            otpInputXPath: '',
            verifyButtonXPath: '',
            otpCode: '',
            usernameXPath: '',
            usernameNextXPath: '',
            passwordXPath: '',
            passwordNextXPath: ''
          });
          setStoredCookies(parsedConfig.capturedCookies || {});
        }
      } catch (error) {
        console.error('Error loading saved configuration:', error);
      }
    };

    loadSavedConfiguration();
  }, []);

  // Update the JSX to display captured cookies
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Login Configuration
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={saveConfiguration}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>
      <form onSubmit={(e) => { e.preventDefault(); startCookieCapture(); }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isInternalUser}
                  onChange={(e) => setIsInternalUser(e.target.checked)}
                  color="primary"
                />
              }
              label="Internal User"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Login URL"
              value={loginUrl}
              onChange={(e) => setLoginUrl(e.target.value)}
              required
              helperText="Enter the URL of the application"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              helperText="Enter username if the application requires login"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Username XPath"
              value={mfaConfig.usernameXPath}
              onChange={(e) => setMfaConfig(prev => ({ ...prev, usernameXPath: e.target.value }))}
              helperText="Enter XPath to locate username input field"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Username Next XPath"
              value={mfaConfig.usernameNextXPath}
              onChange={(e) => setMfaConfig(prev => ({ ...prev, usernameNextXPath: e.target.value }))}
              helperText="Enter XPath to locate username next button"
            />
          </Grid>
          {!isInternalUser && (
            <>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Enter password if the application requires login"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password XPath"
                  value={mfaConfig.passwordXPath}
                  onChange={(e) => setMfaConfig(prev => ({ ...prev, passwordXPath: e.target.value }))}
                  helperText="Enter XPath to locate password input field"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password Next XPath"
                  value={mfaConfig.passwordNextXPath}
                  onChange={(e) => setMfaConfig(prev => ({ ...prev, passwordNextXPath: e.target.value }))}
                  helperText="Enter XPath to locate password next button"
                />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              MFA Configuration (Optional)
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="OTP Input XPath"
              value={mfaConfig.otpInputXPath}
              onChange={(e) => setMfaConfig(prev => ({ ...prev, otpInputXPath: e.target.value }))}
              helperText="Enter XPath to locate OTP input field if the application uses MFA"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Verify Button XPath"
              value={mfaConfig.verifyButtonXPath}
              onChange={(e) => setMfaConfig(prev => ({ ...prev, verifyButtonXPath: e.target.value }))}
              helperText="Enter XPath to locate verify button if the application uses MFA"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="MFA Code"
              value={mfaConfig.otpCode}
              onChange={(e) => setMfaConfig(prev => ({ ...prev, otpCode: e.target.value }))}
              helperText="Enter the MFA code if the application uses MFA"
              type={showMfaCode ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowMfaCode(!showMfaCode)}
                      edge="end"
                    >
                      {showMfaCode ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isCapturing}
            >
              Start Login
            </Button>
            {isCapturing && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={stopCookieCapture}
                sx={{ ml: 2 }}
              >
                Stop
              </Button>
            )}
          </Grid>
        </Grid>
      </form>

      {/* Update TOTP Code View Section */}
      {mfaConfig.otpCode && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Current TOTP Code
          </Typography>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  minWidth: '120px'
                }}
              >
                {showTotpCode ? currentTotpCode : '••••••'}
              </Typography>
              <IconButton
                onClick={() => setShowTotpCode(!showTotpCode)}
                size="small"
              >
                {showTotpCode ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircularProgress
                variant="determinate"
                value={(remainingTime / 30) * 100}
                size={24}
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {remainingTime}s remaining
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Stored Cookies Section */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Stored Cookies
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => fetchCookiesFromTab()}
              disabled={!loginUrl}
            >
              Capture Cookies
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => {
                console.log('Clearing stored cookies...');
                setStoredCookies({});
                localStorage.removeItem('storedCookies');
                onConfigChange({
                  ...config,
                  capturedCookies: {}
                });
                enqueueSnackbar('Cookies cleared successfully', { variant: 'success' });
              }}
              disabled={Object.keys(storedCookies).length === 0}
            >
              Clear Cookies
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={saveConfiguration}
              disabled={isSaving}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(storedCookies).length > 0 ? (
                Object.entries(storedCookies).map(([name, value]) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ fontFamily: 'monospace' }}>
                          {value}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(value);
                            enqueueSnackbar('Cookie value copied to clipboard', { variant: 'success' });
                          }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newCookies = { ...storedCookies };
                          delete newCookies[name];
                          setStoredCookies(newCookies);
                          enqueueSnackbar('Cookie removed', { variant: 'success' });
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography color="textSecondary">
                      No cookies stored. Start login and fetch cookies to see them here.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Captured Cookies Section */}
      {capturedCookies.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Captured Cookies
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Domain</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {capturedCookies.map((cookie, index) => (
                  <TableRow key={index}>
                    <TableCell>{cookie.name}</TableCell>
                    <TableCell>{cookie.value}</TableCell>
                    <TableCell>{cookie.domain}</TableCell>
                    <TableCell>{cookie.path}</TableCell>
                    <TableCell>
                      {cookie.expirationDate
                        ? new Date(cookie.expirationDate * 1000).toLocaleString()
                        : 'Session'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setStoredCookies(prev => ({
                            ...prev,
                            [cookie.name]: cookie.value
                          }));
                          enqueueSnackbar('Cookie stored', { variant: 'success' });
                        }}
                      >
                        <SaveIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

function ApiRequestsPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [apiRequests, setApiRequests] = useState<ApiRequest[]>([]);
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);
  const [currentApiRequest, setCurrentApiRequest] = useState<ApiRequest>(defaultApiRequest);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string>('');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedRequests, setRecordedRequests] = useState<NetworkRequest[]>([]);
  const [showRecordedRequests, setShowRecordedRequests] = useState(false);
  const [recordingWindow, setRecordingWindow] = useState<Window | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [isCapturingCookies, setIsCapturingCookies] = useState(false);
  const [cookieCaptureWindow, setCookieCaptureWindow] = useState<Window | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [newTag, setNewTag] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isInternalUser, setIsInternalUser] = useState(false);
  const [mfaConfig, setMfaConfig] = useState<MFAConfig>({
    otpInputXPath: '',
    verifyButtonXPath: '',
    otpCode: '',
    usernameXPath: '',
    usernameNextXPath: '',
    passwordXPath: '',
    passwordNextXPath: ''
  });

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedRequests = localStorage.getItem(STORAGE_KEYS.API_REQUESTS);
        const savedEnvironments = localStorage.getItem(STORAGE_KEYS.ENVIRONMENTS);

        if (savedRequests) {
          const parsedRequests = JSON.parse(savedRequests);
          // Ensure each request has an assertions array
          const requestsWithAssertions = parsedRequests.map((request: ApiRequest) => ({
            ...request,
            assertions: request.assertions || []
          }));
          setApiRequests(requestsWithAssertions);
        } else {
          setApiRequests([]);
        }

        if (savedEnvironments) {
          const parsedEnvironments = JSON.parse(savedEnvironments);
          setEnvironments(parsedEnvironments);
          
          // Load the last selected environment
          const savedSelectedEnv = localStorage.getItem(STORAGE_KEYS.SELECTED_ENVIRONMENT);
          if (savedSelectedEnv && parsedEnvironments.some((env: Environment) => env.name === savedSelectedEnv)) {
            setSelectedEnvironment(savedSelectedEnv);
          } else if (parsedEnvironments.length > 0) {
            setSelectedEnvironment(parsedEnvironments[0].name);
            localStorage.setItem(STORAGE_KEYS.SELECTED_ENVIRONMENT, parsedEnvironments[0].name);
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
        enqueueSnackbar('Error loading saved data', { variant: 'error' });
        setApiRequests([]);
      }
    };

    loadSavedData();
  }, [enqueueSnackbar]);

  const handleApiDialogOpen = () => {
    setCurrentApiRequest(defaultApiRequest);
    setIsEditing(false);
    setEditIndex(null);
    setIsApiDialogOpen(true);
  };

  const handleApiDialogClose = () => {
    setIsApiDialogOpen(false);
  };

  const handleEditApiRequest = (index: number) => {
    const requestToEdit = apiRequests[index];
    setCurrentApiRequest({
      ...requestToEdit,
      assertions: requestToEdit.assertions?.map(assertion => ({
        ...assertion,
        validationType: assertion.validationType || 'value',
        schema: assertion.schema || ''
      })) || []
    });
    setIsEditing(true);
    setEditIndex(index);
    setIsApiDialogOpen(true);
  };

  const handleAddRequest = () => {
    setCurrentApiRequest({
      ...defaultApiRequest,
      environment: selectedEnvironment
    });
    setIsApiDialogOpen(true);
  };

  const handleApiRequestSave = () => {
    if (!currentApiRequest.name || !currentApiRequest.endpoint) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
      return;
    }

    const updatedRequests = [...apiRequests];
    if (currentApiRequest.id) {
      const index = updatedRequests.findIndex(r => r.id === currentApiRequest.id);
      if (index !== -1) {
        // Ensure assertions are properly saved with all required fields
        updatedRequests[index] = {
          ...currentApiRequest,
          assertions: currentApiRequest.assertions.map(assertion => ({
            id: assertion.id || Date.now().toString(),
            type: assertion.type || 'body',
            path: assertion.path || '',
            operator: assertion.operator || 'equals',
            value: assertion.value || '',
            validationType: assertion.validationType || 'value',
            schema: assertion.schema || '',
            keyValuePairs: assertion.keyValuePairs || []
          }))
        };
      }
    } else {
      // For new requests, ensure assertions array is properly initialized
      updatedRequests.push({
        ...currentApiRequest,
        id: Date.now().toString(),
        assertions: currentApiRequest.assertions.map(assertion => ({
          id: assertion.id || Date.now().toString(),
          type: assertion.type || 'body',
          path: assertion.path || '',
          operator: assertion.operator || 'equals',
          value: assertion.value || '',
          validationType: assertion.validationType || 'value',
          schema: assertion.schema || '',
          keyValuePairs: assertion.keyValuePairs || []
        }))
      });
    }

    setApiRequests(updatedRequests);
    localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(updatedRequests));
    setIsApiDialogOpen(false);
    enqueueSnackbar('API request saved successfully', { variant: 'success' });
  };

  // Add assertion handlers
  const handleAddAssertion = () => {
    if (currentApiRequest) {
      const newAssertion: Assertion = {
        type: 'body',
        path: '',
        operator: 'equals',
        value: '',
        validationType: 'value',
        schema: '',
        keyValuePairs: [],
        id: Date.now().toString()
      };
      setCurrentApiRequest({
        ...currentApiRequest,
        assertions: [...currentApiRequest.assertions, newAssertion]
      });
    }
  };

  const handleAddKeyValuePair = (assertionId: string) => {
    if (currentApiRequest) {
      setCurrentApiRequest({
        ...currentApiRequest,
        assertions: currentApiRequest.assertions.map(assertion => {
          if (assertion.id === assertionId) {
            return {
              ...assertion,
              keyValuePairs: [
                ...(assertion.keyValuePairs || []),
                { key: '', value: '' }
              ]
            };
          }
          return assertion;
        })
      });
    }
  };

  const handleUpdateKeyValuePair = (assertionId: string, index: number, field: 'key' | 'value', value: string) => {
    if (currentApiRequest) {
      setCurrentApiRequest({
        ...currentApiRequest,
        assertions: currentApiRequest.assertions.map(assertion => {
          if (assertion.id === assertionId) {
            const updatedPairs = [...(assertion.keyValuePairs || [])];
            updatedPairs[index] = { ...updatedPairs[index], [field]: value };
            return { ...assertion, keyValuePairs: updatedPairs };
          }
          return assertion;
        })
      });
    }
  };

  const handleRemoveKeyValuePair = (assertionId: string, index: number) => {
    if (currentApiRequest) {
      setCurrentApiRequest({
        ...currentApiRequest,
        assertions: currentApiRequest.assertions.map(assertion => {
          if (assertion.id === assertionId) {
            const updatedPairs = [...(assertion.keyValuePairs || [])];
            updatedPairs.splice(index, 1);
            return { ...assertion, keyValuePairs: updatedPairs };
          }
          return assertion;
        })
      });
    }
  };

  const handleCopyAssertion = (assertion: Assertion) => {
    if (currentApiRequest) {
      const newAssertion: Assertion = {
        ...assertion,
        id: Date.now().toString()
      };
      setCurrentApiRequest({
        ...currentApiRequest,
        assertions: [...currentApiRequest.assertions, newAssertion]
      });
    }
  };

  const handleDeleteAssertion = (id: string) => {
    if (currentApiRequest) {
      setCurrentApiRequest({
        ...currentApiRequest,
        assertions: currentApiRequest.assertions.filter(a => a.id !== id)
      });
    }
  };

  const handleUpdateAssertion = (id: string, field: keyof Assertion, value: string) => {
    setCurrentApiRequest(prev => ({
      ...prev,
      assertions: prev.assertions.map(assertion => {
        if (assertion.id === id) {
          return {
            ...assertion,
            [field]: value
          };
        }
        return assertion;
      })
    }));
  };

  const handleDeleteApiRequest = (index: number) => {
    try {
      const updatedRequests = apiRequests.filter((_, i) => i !== index);
      setApiRequests(updatedRequests);
      localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(updatedRequests));
      enqueueSnackbar('API request deleted successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error deleting API request', { variant: 'error' });
    }
  };

  const toggleExpand = (index: number) => {
    setExpanded(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !apiRequests) return;

    const items = Array.from(apiRequests);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setApiRequests(items);
    localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(items));
  };

  const getSuiteColor = (suite: string) => {
    const colors: { [key: string]: { background: string; text: string } } = {
      [TEST_SUITES.SMOKE]: { background: '#e8f5e9', text: '#2e7d32' }, // Pastel green
      [TEST_SUITES.REGRESSION]: { background: '#e3f2fd', text: '#1565c0' }, // Pastel blue
      [TEST_SUITES.SANITY]: { background: '#fff3e0', text: '#ef6c00' }, // Pastel orange
      [TEST_SUITES.PERFORMANCE]: { background: '#fce4ec', text: '#c2185b' }, // Pastel pink
    };
    return colors[suite] || { background: '#f5f5f5', text: '#616161' }; // Default pastel gray
  };

  const downloadTemplate = () => {
    try {
      const template = [
        {
          'Name': 'Sample API Request',
          'Method': 'GET',
          'Endpoint': '/api/endpoint',
          'Headers': JSON.stringify({
            "Content-Type": "application/json",
            "Authorization": "Bearer {token}"
          }, null, 2),
          'Body': JSON.stringify({
            "key": "value"
          }, null, 2),
          'Expected Status': 200,
          'Suite': 'default',
          'Environment': 'dev',
          'Assertions': JSON.stringify([
            {
              id: "1",
              type: "body",
              path: "data.id",
              operator: "equals",
              value: "123",
              validationType: "value",
              schema: "",
              keyValuePairs: []
            },
            {
              id: "2",
              type: "status",
              path: "",
              operator: "equals",
              value: "200",
              validationType: "value",
              schema: "",
              keyValuePairs: []
            }
          ], null, 2)
        }
      ];

      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'API Requests');
      XLSX.writeFile(wb, 'api-requests-template.xlsx');
      enqueueSnackbar('Template downloaded successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error downloading template', { variant: 'error' });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<ApiRequest>(worksheet);
            const updatedRequests = [...apiRequests, ...jsonData];
            setApiRequests(updatedRequests);
            localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(updatedRequests));
            enqueueSnackbar('API requests imported successfully', { variant: 'success' });
          } catch (error) {
            enqueueSnackbar('Error parsing Excel file', { variant: 'error' });
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        enqueueSnackbar('Error reading file', { variant: 'error' });
      }
    }
  };

  const handleCopyRequest = (request: ApiRequest) => {
    // Find the highest number used in existing copies
    const copyRegex = /\((\d+)\)$/;
    const existingCopies = apiRequests
      .filter(r => r.name.startsWith(request.name))
      .map(r => {
        const match = r.name.match(copyRegex);
        return match ? parseInt(match[1]) : 0;
      });
    
    const nextCopyNumber = Math.max(0, ...existingCopies) + 1;
    const newRequest: ApiRequest = {
      ...request,
      name: `${request.name} (${nextCopyNumber})`,
      id: Date.now().toString(),
      tags: request.tags.slice(),
    };
    setApiRequests(prev => [...prev, newRequest]);
    localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify([...apiRequests, newRequest]));
    enqueueSnackbar(`API request "${newRequest.name}" copied successfully`, { 
      variant: 'success',
      autoHideDuration: 3000,
      anchorOrigin: { vertical: 'top', horizontal: 'right' }
    });
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteDialogOpen(true);
    setRequestToDelete(id);
  };

  const confirmDelete = () => {
    const updatedRequests = apiRequests.filter(request => request.id !== requestToDelete);
    setApiRequests(updatedRequests);
    localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(updatedRequests));
    setDeleteDialogOpen(false);
    enqueueSnackbar('API request deleted successfully', { variant: 'success' });
  };

  const handleApiRequestEdit = (request: ApiRequest) => {
    setCurrentApiRequest({
      ...request,
      headers: Array.isArray(request.headers) ? request.headers : [],
      assertions: Array.isArray(request.assertions) ? request.assertions : [],
      tags: Array.isArray(request.tags) ? request.tags : []
    });
    setIsApiDialogOpen(true);
  };

  const handleHeaderChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const headerLines = e.target.value.split('\n').filter(line => line.trim());
      const headers = headerLines.map(line => {
        const [key, ...valueParts] = line.split(':');
        return {
          key: key.trim(),
          value: valueParts.join(':').trim()
        };
      }).filter(header => header.key && header.value);
      
      setCurrentApiRequest(prev => ({
        ...prev,
        headers: headers || []
      }));
    } catch (error) {
      console.error('Error parsing headers:', error);
      setCurrentApiRequest(prev => ({
        ...prev,
        headers: []
      }));
    }
  };

  const handleAddEnvironment = () => {
    // Implementation for adding a new environment
  };

  const handleEditEnvironment = (env: Environment) => {
    // Implementation for editing an environment
  };

  const handleDeleteEnvironment = (name: string) => {
    // Implementation for deleting an environment
  };

  const handleEnvironmentChange = (event: SelectChangeEvent) => {
    const newEnvironment = event.target.value;
    setSelectedEnvironment(newEnvironment);
    localStorage.setItem(STORAGE_KEYS.SELECTED_ENVIRONMENT, newEnvironment);
  };

  // Function to start recording network requests
  const startRecording = () => {
    console.log('Starting network recording...');
    const url = prompt('Enter URL to record traffic from:');
    if (!url) {
      console.log('No URL provided, stopping recording');
      enqueueSnackbar('Please enter a valid URL', { variant: 'error' });
      return;
    }
    console.log('Recording URL:', url);

    setRecordingUrl(url);
    setIsRecording(true);
    setRecordedRequests([]);

    // Create a new window instead of an iframe
    const newWindow = window.open(url, '_blank', 'width=1200,height=800');
    if (!newWindow) {
      console.error('Failed to open new window');
      enqueueSnackbar('Failed to open new window. Please allow popups.', { variant: 'error' });
      setIsRecording(false);
      return;
    }
    console.log('New window opened successfully');

    setRecordingWindow(newWindow);
    enqueueSnackbar('Network recording started', { variant: 'info' });

    const messageHandler = (event: MessageEvent) => {
      console.log('Received message event:', event);
      if (event.data && event.data.type === 'NETWORK_REQUEST') {
        console.log('Processing network request:', event.data.request);
        const request = event.data.request;
        setRecordedRequests(prev => {
          const isDuplicate = prev.some(r => 
            r.method === request.method && 
            r.endpoint === request.endpoint && 
            r.timestamp === request.timestamp
          );
          
          if (!isDuplicate) {
            console.log('Adding new request to recorded requests');
            return [...prev, request];
          }
          console.log('Duplicate request detected, skipping');
          return prev;
        });
      } else {
        console.log('Received non-network request message:', event.data);
      }
    };

    window.addEventListener('message', messageHandler);
    (window as any).messageHandler = messageHandler;
    console.log('Message handler added');

    const interceptorScript = `
      (function() {
        console.log('Network interceptor script initialized');
        
        // Store original fetch
        const originalFetch = window.fetch;
        
        // Override fetch
        window.fetch = async function(input, init) {
          console.log('Intercepted fetch request:', { input, init });
          const startTime = Date.now();
          
          try {
            const response = await originalFetch(input, init);
            const responseClone = response.clone();
            const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
            const method = init?.method || 'GET';
            const headers = init?.headers ? Object.entries(init.headers).map(([key, value]) => ({
              key,
              value: String(value)
            })) : [];
            const body = init?.body ? String(init.body) : '{}';
            const status = response.status;
            const responseBody = await responseClone.text();

            console.log('Captured fetch request details:', {
              url,
              method,
              headers,
              body,
              status,
              responseBody
            });

            // Send request details to parent window
            try {
              window.opener.postMessage({
                type: 'NETWORK_REQUEST',
                request: {
                  id: Date.now().toString(),
                  name: \`\${method} \${url}\`,
                  method,
                  endpoint: url,
                  headers,
                  body,
                  response: responseBody,
                  status,
                  timestamp: startTime
                }
              }, '*');
              console.log('Successfully sent fetch request to parent window');
            } catch (error) {
              console.error('Error sending fetch request to parent window:', error);
            }
          } catch (error) {
            console.error('Error in fetch interceptor:', error);
          }

          return response;
        };

        // Store original XHR
        const originalXHR = window.XMLHttpRequest;
        
        // Override XHR
        window.XMLHttpRequest = function() {
          console.log('Intercepted XHR request');
          const xhr = new originalXHR();
          const originalOpen = xhr.open;
          const originalSend = xhr.send;
          const originalSetRequestHeader = xhr.setRequestHeader;
          let requestHeaders = [];
          let requestBody = null;

          xhr.setRequestHeader = function(header, value) {
            console.log('XHR request header set:', { header, value });
            requestHeaders.push({ key: header, value: String(value) });
            return originalSetRequestHeader.apply(this, arguments);
          };

          xhr.open = function(method, url) {
            console.log('XHR request opened:', { method, url });
            this._url = url;
            this._method = method;
            return originalOpen.apply(this, arguments);
          };

          xhr.send = function(data) {
            console.log('XHR request sent:', { data });
            const startTime = Date.now();
            requestBody = data;
            const originalOnReadyStateChange = this.onreadystatechange;

            this.onreadystatechange = function() {
              if (this.readyState === 4) {
                console.log('XHR request completed:', {
                  method: this._method,
                  url: this._url,
                  status: this.status,
                  response: this.responseText
                });
                try {
                  window.opener.postMessage({
                    type: 'NETWORK_REQUEST',
                    request: {
                      id: Date.now().toString(),
                      name: \`\${this._method} \${this._url}\`,
                      method: this._method,
                      endpoint: this._url,
                      headers: requestHeaders,
                      body: requestBody || '{}',
                      response: this.responseText,
                      status: this.status,
                      timestamp: startTime
                    }
                  }, '*');
                  console.log('Successfully sent XHR request to parent window');
                } catch (error) {
                  console.error('Error sending XHR request to parent window:', error);
                }
              }
              if (originalOnReadyStateChange) {
                originalOnReadyStateChange.apply(this, arguments);
              }
            };

            return originalSend.apply(this, arguments);
          };

          return xhr;
        };

        // Test the interceptor
        console.log('Testing fetch interceptor...');
        fetch('https://reqres.in/api/users?page=1')
          .then(response => response.json())
          .then(data => console.log('Test fetch request completed:', data))
          .catch(error => console.error('Test fetch request failed:', error));

        console.log('Network interceptor setup complete');
      })();
    `;

    const injectScript = () => {
      try {
        // Create a script element
        const scriptElement = newWindow.document.createElement('script');
        scriptElement.textContent = interceptorScript;
        
        // Add the script to the document
        newWindow.document.head.appendChild(scriptElement);
        
        // Remove the script element after injection
        newWindow.document.head.removeChild(scriptElement);
        
        console.log('Interceptor script injected successfully');
        enqueueSnackbar('Network interceptor initialized', { variant: 'success' });
      } catch (error) {
        console.error('Error injecting interceptor script:', error);
        enqueueSnackbar('Error setting up network recording', { variant: 'error' });
        stopRecording();
      }
    };

    // Wait for the window to load
    if (newWindow.document.readyState === 'complete') {
      console.log('Window already loaded, injecting interceptor script');
      injectScript();
    } else {
      newWindow.addEventListener('load', () => {
        console.log('Window loaded, injecting interceptor script');
        injectScript();
      });
    }
  };

  const stopRecording = () => {
    console.log('Stopping network recording...');
    setIsRecording(false);
    
    if ((window as any).messageHandler) {
      console.log('Removing message handler');
      window.removeEventListener('message', (window as any).messageHandler);
      delete (window as any).messageHandler;
    }

    if (recordingWindow) {
      console.log('Closing recording window');
      setTimeout(() => {
        recordingWindow.close();
        setRecordingWindow(null);
      }, 1000);
    }

    setShowRecordedRequests(true);
    console.log('Network recording stopped');
    enqueueSnackbar('Network recording stopped', { variant: 'info' });
  };

  useEffect(() => {
    return () => {
      console.log('Cleaning up network recording...');
      if (recordingWindow) {
        recordingWindow.close();
      }
      if ((window as any).messageHandler) {
        window.removeEventListener('message', (window as any).messageHandler);
        delete (window as any).messageHandler;
      }
    };
  }, [recordingWindow]);

  // Function to add recorded request to API requests
  const addRecordedRequest = (request: NetworkRequest) => {
    try {
      const newApiRequest: ApiRequest = {
        id: Date.now().toString(),
        name: `${request.method} ${request.endpoint}`,
        method: request.method,
        endpoint: request.endpoint,
        headers: request.headers,
        body: request.body,
        expectedStatus: request.status,
        assertions: [],
        suite: 'recorded',
        environment: selectedEnvironment,
        tags: [],
      };

      setApiRequests(prev => {
        const updatedRequests = [...prev, newApiRequest];
        localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(updatedRequests));
        return updatedRequests;
      });

      enqueueSnackbar('Recorded request added successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error adding recorded request:', error);
      enqueueSnackbar('Error adding recorded request', { variant: 'error' });
    }
  };

  const handleExportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = apiRequests.map(request => ({
        'Name': request.name || '',
        'Method': request.method || 'GET',
        'Endpoint': request.endpoint || '',
        'Headers': JSON.stringify(request.headers || [], null, 2),
        'Body': request.body || '',
        'Expected Status': request.expectedStatus || 200,
        'Suite': request.suite || '',
        'Environment': request.environment || '',
        'Tags': (request.tags || []).join(', '),
        'Assertions': JSON.stringify(request.assertions || [], null, 2)
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        {wch: 20}, // Name
        {wch: 10}, // Method
        {wch: 40}, // Endpoint
        {wch: 30}, // Headers
        {wch: 30}, // Body
        {wch: 15}, // Expected Status
        {wch: 15}, // Suite
        {wch: 15}, // Environment
        {wch: 20}, // Tags
        {wch: 40}  // Assertions
      ];
      ws['!cols'] = wscols;

      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'API Requests');

      // Save file
      XLSX.writeFile(wb, 'api-requests.xlsx');
      enqueueSnackbar('API requests exported successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      enqueueSnackbar('Error exporting API requests', { variant: 'error' });
    }
  };

  const handleImportFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedRequests = jsonData.map((item: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: item['Name'] || '',
          method: item['Method'] || 'GET',
          endpoint: item['Endpoint'] || '',
          headers: item['Headers'] ? JSON.parse(item['Headers']) : [],
          body: item['Body'] || '',
          expectedStatus: item['Expected Status'] || 200,
          suite: item['Suite'] || '',
          environment: item['Environment'] || selectedEnvironment,
          tags: item['Tags'] ? item['Tags'].split(',').map((tag: string) => tag.trim()) : [],
          assertions: item['Assertions'] ? JSON.parse(item['Assertions']) : []
        }));

        setApiRequests(prev => [...prev, ...importedRequests]);
        localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify([...apiRequests, ...importedRequests]));
        enqueueSnackbar('API requests imported successfully', { variant: 'success' });
      } catch (error) {
        console.error('Error importing from Excel:', error);
        enqueueSnackbar('Error importing API requests', { variant: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          API Requests
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          gap: 2, 
          mb: 2,
          flexWrap: 'wrap'
        }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportToExcel}
            size="small"
          >
            Export
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            size="small"
          >
            Import
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={handleImportFromExcel}
            />
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRequest}
            size="small"
          >
            Add Request
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="API Requests" />
                <Tab label="Configuration" />
              </Tabs>

              {activeTab === 0 && (
                <Box sx={{ mt: 2 }}>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="api-requests">
                      {(provided) => (
                        <TableContainer 
                          component={Paper} 
                          variant="outlined"
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell width="40px"></TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell>Endpoint</TableCell>
                                <TableCell>Suite</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Assertions</TableCell>
                                <TableCell>Tags</TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(apiRequests || []).map((request, index) => (
                                <Draggable
                                  key={request.id || `request-${index}`}
                                  draggableId={request.id || `request-${index}`}
                                  index={index}
                                >
                                  {(provided) => (
                                    <React.Fragment>
                                      <TableRow
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                      >
                                        <TableCell {...provided.dragHandleProps} sx={{ cursor: 'move', width: '40px' }}>
                                          <DragIndicatorIcon fontSize="small" />
                                        </TableCell>
                                        <TableCell>{request.name}</TableCell>
                                        <TableCell>{request.method}</TableCell>
                                        <TableCell>{request.endpoint}</TableCell>
                                        <TableCell>
                                          <Chip 
                                            label={request.suite} 
                                            sx={{ 
                                              backgroundColor: getSuiteColor(request.suite).background,
                                              color: getSuiteColor(request.suite).text,
                                              '&:hover': {
                                                backgroundColor: getSuiteColor(request.suite).background,
                                                opacity: 0.8
                                              }
                                            }}
                                            size="small"
                                          />
                                        </TableCell>
                                        <TableCell>{request.expectedStatus}</TableCell>
                                        <TableCell>
                                          <Chip 
                                            label={`${request.assertions?.length || 0} assertions`}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {(request.tags || []).map((tag, index) => (
                                              <Chip
                                                key={index}
                                                label={tag}
                                                size="small"
                                                sx={{ 
                                                  backgroundColor: 'primary.light',
                                                  color: 'primary.contrastText',
                                                  '&:hover': {
                                                    backgroundColor: 'primary.main',
                                                  }
                                                }}
                                              />
                                            ))}
                                          </Box>
                                        </TableCell>
                                        <TableCell>
                                          <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Tooltip title="Edit">
                                              <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleApiRequestEdit(request)}
                                              >
                                                <EditIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Copy">
                                              <IconButton
                                                size="small"
                                                onClick={() => handleCopyRequest(request)}
                                              >
                                                <ContentCopyIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                              <IconButton
                                                size="small"
                                                onClick={() => handleDeleteRequest(request.id)}
                                                color="error"
                                              >
                                                <DeleteIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                      <TableRow>
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                                          <Collapse in={expanded[index] ?? false} timeout="auto" unmountOnExit>
                                            <Box sx={{ margin: 1 }}>
                                              <Grid container spacing={2}>
                                                <Grid item xs={12}>
                                                  <Typography variant="subtitle2" gutterBottom>
                                                    Assertions
                                                  </Typography>
                                                  {(request.assertions || []).map((assertion, assertionIndex) => (
                                                    <Box key={assertion.id} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                                      <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={3}>
                                                          <Typography variant="body2" color="text.secondary">
                                                            Type: {assertion.type}
                                                          </Typography>
                                                        </Grid>
                                                        {assertion.type !== 'status' && (
                                                          <Grid item xs={12} sm={3}>
                                                            <Typography variant="body2" color="text.secondary">
                                                              Path: {assertion.path}
                                                            </Typography>
                                                          </Grid>
                                                        )}
                                                        <Grid item xs={12} sm={3}>
                                                          <Typography variant="body2" color="text.secondary">
                                                            Operator: {assertion.operator}
                                                          </Typography>
                                                        </Grid>
                                                        {assertion.operator !== 'keyValue' && (
                                                          <Grid item xs={12} sm={3}>
                                                            <Typography variant="body2" color="text.secondary">
                                                              Value: {assertion.value}
                                                            </Typography>
                                                          </Grid>
                                                        )}
                                                        {assertion.operator === 'keyValue' && (
                                                          <Grid item xs={12}>
                                                            <Typography variant="body2" color="text.secondary">
                                                              Key-Value Pairs:
                                                            </Typography>
                                                            {(assertion.keyValuePairs ?? []).map((pair, pairIndex) => (
                                                              <Typography key={pairIndex} variant="body2" color="text.secondary">
                                                                {pair.key}: {pair.value}
                                                              </Typography>
                                                            ))}
                                                          </Grid>
                                                        )}
                                                      </Grid>
                                                    </Box>
                                                  ))}
                                                </Grid>
                                              </Grid>
                                            </Box>
                                          </Collapse>
                                        </TableCell>
                                      </TableRow>
                                    </React.Fragment>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Droppable>
                  </DragDropContext>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ mt: 2 }}>
                  <ConfigurationTab 
                    config={currentApiRequest} 
                    onConfigChange={setCurrentApiRequest} 
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={isApiDialogOpen}
        onClose={() => setIsApiDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentApiRequest.id ? 'Edit' : 'Add'} API Request
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Request Name"
                value={currentApiRequest.name}
                onChange={(e) => setCurrentApiRequest(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Method</InputLabel>
                <Select
                  value={currentApiRequest.method}
                  label="Method"
                  onChange={(e) => setCurrentApiRequest(prev => ({ ...prev, method: e.target.value }))}
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Test Suite</InputLabel>
                <Select
                  value={currentApiRequest.suite}
                  label="Test Suite"
                  onChange={(e) => setCurrentApiRequest({ ...currentApiRequest, suite: e.target.value })}
                >
                  <MenuItem value={TEST_SUITES.SMOKE}>Smoke Tests</MenuItem>
                  <MenuItem value={TEST_SUITES.REGRESSION}>Regression Tests</MenuItem>
                  <MenuItem value={TEST_SUITES.SANITY}>Sanity Tests</MenuItem>
                  <MenuItem value={TEST_SUITES.PERFORMANCE}>Performance Tests</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Environment</InputLabel>
                <Select
                  value={currentApiRequest.environment}
                  label="Environment"
                  onChange={(e) => setCurrentApiRequest({ ...currentApiRequest, environment: e.target.value })}
                >
                  {environments.map((env) => (
                    <MenuItem key={env.name} value={env.name}>
                      {env.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Expected Status"
                type="number"
                value={currentApiRequest.expectedStatus}
                onChange={(e) => setCurrentApiRequest({ ...currentApiRequest, expectedStatus: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Endpoint"
                value={currentApiRequest.endpoint}
                onChange={(e) => setCurrentApiRequest({ ...currentApiRequest, endpoint: e.target.value })}
                helperText={
                  selectedEnvironment
                    ? `Base URL: ${environments.find(env => env.name === selectedEnvironment)?.baseUrl}
                    Use parameters with ${'{paramName}'} syntax, e.g., /users?name=${'{name}'}&age=${'{age}'}`
                    : 'Please select an environment first'
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={Array.isArray(currentApiRequest.headers) ? currentApiRequest.headers.map(h => `${h.key}: ${h.value}`).join('\n') : ''}
                onChange={handleHeaderChange}
                helperText="Enter headers in 'key: value' format (one per line)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Request Body"
                multiline
                rows={3}
                value={currentApiRequest.body}
                onChange={(e) => setCurrentApiRequest({ ...currentApiRequest, body: e.target.value })}
                helperText="Enter request body in JSON format"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  {currentApiRequest.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => {
                        setCurrentApiRequest(prev => ({
                          ...prev,
                          tags: prev.tags.filter((_, i) => i !== index)
                        }));
                      }}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        setCurrentApiRequest(prev => ({
                          ...prev,
                          tags: [...prev.tags, newTag.trim()]
                        }));
                        setNewTag('');
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      if (newTag.trim()) {
                        setCurrentApiRequest(prev => ({
                          ...prev,
                          tags: [...prev.tags, newTag.trim()]
                        }));
                        setNewTag('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Grid>

            {/* Assertions Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Response Assertions</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddAssertion}
                >
                  Add Assertion
                </Button>
              </Box>
              {currentApiRequest.assertions.map((assertion) => (
                <Box key={assertion.id} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={assertion.type}
                          label="Type"
                          onChange={(e) => handleUpdateAssertion(assertion.id, 'type', e.target.value)}
                        >
                          <MenuItem value="status">Status</MenuItem>
                          <MenuItem value="body">Body</MenuItem>
                          <MenuItem value="header">Headers</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {assertion.type !== 'status' && (
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          label="Path"
                          value={assertion.path}
                          onChange={(e) => handleUpdateAssertion(assertion.id, 'path', e.target.value)}
                          helperText="JSON path or header name"
                        />
                      </Grid>
                    )}
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth>
                        <InputLabel>Operator</InputLabel>
                        <Select
                          value={assertion.operator}
                          label="Operator"
                          onChange={(e) => handleUpdateAssertion(assertion.id, 'operator', e.target.value)}
                        >
                          <MenuItem value="equals">Equals</MenuItem>
                          <MenuItem value="contains">Contains</MenuItem>
                          <MenuItem value="matches">Matches</MenuItem>
                          <MenuItem value="exists">Exists</MenuItem>
                          <MenuItem value="keyValue">Key-Value Pairs</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {assertion.operator !== 'keyValue' && (
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          label="Value"
                          value={assertion.value}
                          onChange={(e) => handleUpdateAssertion(assertion.id, 'value', e.target.value)}
                        />
                      </Grid>
                    )}
                    {assertion.operator === 'keyValue' && (
                      <Grid item xs={12}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Key-Value Pairs:
                          </Typography>
                          {(assertion.keyValuePairs ?? []).map((pair, index) => (
                            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                              <TextField
                                fullWidth
                                label="Key"
                                value={pair.key}
                                onChange={(e) => handleUpdateKeyValuePair(assertion.id, index, 'key', e.target.value)}
                              />
                              <TextField
                                fullWidth
                                label="Value"
                                value={pair.value}
                                onChange={(e) => handleUpdateKeyValuePair(assertion.id, index, 'value', e.target.value)}
                              />
                              <IconButton
                                color="error"
                                onClick={() => handleRemoveKeyValuePair(assertion.id, index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ))}
                          <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddKeyValuePair(assertion.id)}
                            sx={{ mt: 1 }}
                          >
                            Add Key-Value Pair
                          </Button>
                        </Box>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Validation Type</InputLabel>
                        <Select
                          value={assertion.validationType}
                          label="Validation Type"
                          onChange={(e) => handleUpdateAssertion(assertion.id, 'validationType', e.target.value)}
                        >
                          <MenuItem value="value">Value</MenuItem>
                          <MenuItem value="schema">Schema</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {assertion.validationType === 'schema' && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Schema"
                          multiline
                          rows={4}
                          value={assertion.schema}
                          onChange={(e) => handleUpdateAssertion(assertion.id, 'schema', e.target.value)}
                          helperText="Enter JSON schema for validation"
                        />
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => handleCopyAssertion(assertion)}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteAssertion(assertion.id)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsApiDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleApiRequestSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this API request? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recorded Requests Dialog */}
      <Dialog
        open={showRecordedRequests}
        onClose={() => setShowRecordedRequests(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Recorded Network Requests</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Method</TableCell>
                  <TableCell>Endpoint</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recordedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.method}</TableCell>
                    <TableCell>{request.endpoint}</TableCell>
                    <TableCell>{request.status}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          addRecordedRequest(request);
                          setShowRecordedRequests(false);
                        }}
                      >
                        Add to API Requests
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRecordedRequests(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ApiRequestsPanel; 