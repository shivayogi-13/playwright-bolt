/// <reference types="vite/client" />

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  SelectChangeEvent,
  Checkbox,
  TableSortLabel,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useForm, Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon,
  ContentCopy as ContentCopyIcon,
  HelpOutline as HelpOutlineIcon,
  Save as SaveIcon,
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { TOTP } from 'otpauth';
import { authenticator } from 'otplib';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface ConfigFormData {
  baseUrl: string;
  testUserEmail: string;
  testUserPassword: string;
  mfaEnabled: boolean;
  mfaSecretKey: string;
  bearerToken: string;
  currentTotpCode: string;
  cookies: string;
  environment: string;
  mfaRequest: MFARequest;
}

interface ExpandedState {
  [key: number]: boolean;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: string;
  secure: boolean;
  httpOnly: boolean;
}

interface TestCookies {
  testName: string;
  cookies: Cookie[];
}

interface Environment {
  name: string;
  baseUrl: string;
  parameters: { [key: string]: string };
}

interface MFAConfig {
  enabled: boolean;
  secretKey: string;
  currentCode: string;
  lastGenerated: number;
  remainingTime: number;
  error: string;
  isValid: boolean;
}

interface MFARequest {
  name: string;
  method: string;
  endpoint: string;
  headers: string;
  body: string;
  expectedStatus: number;
  responseVariables: Array<{ name: string; value: string }>;
  cookieVariables: Array<{ name: string; cookieName: string }>;
}

const STORAGE_KEYS = {
  CONFIG: 'test_automation_config',
  TEST_STATUS: 'test_automation_status',
  ENVIRONMENTS: 'test_automation_environments',
  SELECTED_ENVIRONMENT: 'test_automation_selected_environment'
};

export const TEST_SUITES = {
  SMOKE: 'smoke',
  REGRESSION: 'regression',
  SANITY: 'sanity',
  PERFORMANCE: 'performance',
};

const isValidBase32 = (str: string) => {
  const base32Regex = /^[A-Z2-7]+=*$/;
  return base32Regex.test(str.toUpperCase());
};

interface ExpandedSections {
  basic: boolean;
  mfa: boolean;
  api: boolean;
  cookies: boolean;
  environment: boolean;
}

const defaultMfaRequest: MFARequest = {
  name: 'MFA Request',
  method: 'POST',
  endpoint: '',
  headers: '',
  body: '',
  expectedStatus: 200,
  responseVariables: [],
  cookieVariables: []
};

function ConfigurationPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [currentTotpCode, setCurrentTotpCode] = useState<string>('');
  const [lastGenerated, setLastGenerated] = useState<number>(0);
  const [testCookies, setTestCookies] = useState<TestCookies[]>([]);
  const [remainingTime, setRemainingTime] = useState<number>(30);
  const [mfaSecretError, setMfaSecretError] = useState<string>('');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [isEnvironmentDialogOpen, setIsEnvironmentDialogOpen] = useState(false);
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment>({
    name: '',
    baseUrl: '',
    parameters: {}
  });
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    basic: true,
    mfa: true,
    api: true,
    cookies: true,
    environment: true,
  });
  const [editingParamKey, setEditingParamKey] = useState<string | null>(null);
  const [mfaConfig, setMfaConfig] = useState<MFAConfig>({
    enabled: false,
    secretKey: '',
    currentCode: '',
    lastGenerated: 0,
    remainingTime: 30,
    error: '',
    isValid: false
  });
  const [mfaRequest, setMfaRequest] = useState<MFARequest>({
    name: 'MFA Request',
    method: 'POST',
    endpoint: '',
    headers: '',
    body: '',
    expectedStatus: 200,
    responseVariables: [],
    cookieVariables: []
  });
  const [storedResponseVariables, setStoredResponseVariables] = useState<Array<{ name: string; value: string }>>([]);
  const [storedCookieVariables, setStoredCookieVariables] = useState<Array<{ name: string; cookieName: string }>>([]);

  const { control, handleSubmit, watch, reset } = useForm<ConfigFormData>({
    defaultValues: {
      baseUrl: import.meta.env.VITE_API_BASE_URL || '',
      testUserEmail: import.meta.env.VITE_TEST_USER_EMAIL || '',
      testUserPassword: import.meta.env.VITE_TEST_USER_PASSWORD || '',
      mfaEnabled: import.meta.env.VITE_MFA_ENABLED === 'true',
      mfaSecretKey: import.meta.env.VITE_MFA_SECRET_KEY || '',
      bearerToken: '',
      currentTotpCode: '',
      cookies: '',
      environment: '',
      mfaRequest: defaultMfaRequest,
    },
  });

  const bearerToken = watch('bearerToken');
  const testUserEmail = watch('testUserEmail');
  const testUserPassword = watch('testUserPassword');
  const mfaEnabled = watch('mfaEnabled');
  const mfaSecretKey = watch('mfaSecretKey');

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
        const savedEnvironments = localStorage.getItem(STORAGE_KEYS.ENVIRONMENTS);

        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          reset(parsedConfig);
        }

        if (savedEnvironments) {
          const parsedEnvironments = JSON.parse(savedEnvironments);
          setEnvironments(parsedEnvironments);
          
          // Load the last selected environment
          const savedSelectedEnv = localStorage.getItem(STORAGE_KEYS.SELECTED_ENVIRONMENT);
          if (savedSelectedEnv && parsedEnvironments.some((env: Environment) => env.name === savedSelectedEnv)) {
            setSelectedEnvironment(savedSelectedEnv);
          } else if (parsedEnvironments.length > 0) {
            // If no saved selection or saved selection is invalid, select the first environment
            setSelectedEnvironment(parsedEnvironments[0].name);
            localStorage.setItem(STORAGE_KEYS.SELECTED_ENVIRONMENT, parsedEnvironments[0].name);
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
        enqueueSnackbar('Error loading saved data', { variant: 'error' });
      }
    };

    loadSavedData();
  }, [reset, enqueueSnackbar]);

  // Save selected environment when it changes
  useEffect(() => {
    if (selectedEnvironment) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_ENVIRONMENT, selectedEnvironment);
    }
  }, [selectedEnvironment]);

  // Validate MFA secret key
  const validateMfaSecret = (secret: string): boolean => {
    if (!secret) return false;
    // Check if secret is valid base32
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret.toUpperCase());
  };

  // Generate TOTP code
  const generateTOTP = (secret: string): string => {
    try {
      authenticator.options = {
        window: 0,
        step: 30,
        digits: 6
      };
      return authenticator.generate(secret);
    } catch (error) {
      console.error('TOTP generation error:', error);
      return '';
    }
  };

  // Update TOTP code and timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (mfaConfig.enabled && mfaConfig.secretKey) {
      // Initial code generation
      const code = generateTOTP(mfaConfig.secretKey);
      setMfaConfig(prev => ({
        ...prev,
        currentCode: code,
        lastGenerated: Date.now(),
        isValid: true
      }));

      // Set up timer for regeneration
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - mfaConfig.lastGenerated) / 1000);
        const remaining = 30 - (elapsed % 30);

        if (remaining === 30) {
          const newCode = generateTOTP(mfaConfig.secretKey);
          setMfaConfig(prev => ({
            ...prev,
            currentCode: newCode,
            lastGenerated: now
          }));
        }

        setMfaConfig(prev => ({
          ...prev,
          remainingTime: remaining
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mfaConfig.enabled, mfaConfig.secretKey]);

  // Handle MFA secret key changes
  const handleMfaSecretChange = (secret: string) => {
    const isValid = validateMfaSecret(secret);
    setMfaConfig(prev => ({
      ...prev,
      secretKey: secret,
      isValid,
      error: isValid ? '' : 'Invalid MFA secret key format'
    }));
  };

  // Listen for cookie updates from ExecutionPanel
  useEffect(() => {
    const handleCookieUpdate = (event: CustomEvent<string>) => {
      const cookies = event.detail;
      setTestCookies(prevCookies => {
        const updatedCookies = [...prevCookies];
        const existingIndex = updatedCookies.findIndex(tc => tc.testName === 'mfa');
        try {
          // Parse cookies string into key-value pairs
          const cookiePairs = cookies.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            return { name: name.trim(), value: value.trim() };
          });

          const parsedCookies: Cookie[] = cookiePairs.map(pair => ({
            name: pair.name,
            value: pair.value,
            domain: window.location.hostname,
            path: '/',
            secure: true,
            httpOnly: true
          }));

          if (existingIndex >= 0) {
            updatedCookies[existingIndex] = { testName: 'mfa', cookies: parsedCookies };
          } else {
            updatedCookies.push({ testName: 'mfa', cookies: parsedCookies });
          }
        } catch (error) {
          console.error('Error parsing cookies:', error);
        }
        return updatedCookies;
      });
      enqueueSnackbar('MFA cookies updated', { variant: 'success' });
    };

    window.addEventListener('mfa_cookies_updated', handleCookieUpdate as EventListener);
    return () => {
      window.removeEventListener('mfa_cookies_updated', handleCookieUpdate as EventListener);
    };
  }, [enqueueSnackbar]);

  // Load saved cookies on mount
  useEffect(() => {
    const savedCookies = localStorage.getItem('test_cookies');
    if (savedCookies) {
      try {
        const cookies = JSON.parse(savedCookies);
        const testCookiesArray = Object.entries(cookies).map(([testName, cookies]) => ({
          testName,
          cookies: cookies as Cookie[]
        }));
        setTestCookies(testCookiesArray);
      } catch (error) {
        console.error('Error loading saved cookies:', error);
      }
    }
  }, []);

  // Add this useEffect to load stored variables
  useEffect(() => {
    const loadStoredVariables = () => {
      const savedResponseVars = localStorage.getItem('stored_response_variables');
      const savedCookieVars = localStorage.getItem('stored_cookie_variables');
      
      if (savedResponseVars) {
        setStoredResponseVariables(JSON.parse(savedResponseVars));
      }
      if (savedCookieVars) {
        setStoredCookieVariables(JSON.parse(savedCookieVars));
      }
    };

    loadStoredVariables();
  }, []);

  const onSubmit = async (data: ConfigFormData) => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data));
      enqueueSnackbar('Configuration saved successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error saving configuration', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (index: number) => {
    setExpanded(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const getSuiteColor = (suite: string) => {
    const colors: { [key: string]: string } = {
      [TEST_SUITES.SMOKE]: 'success',
      [TEST_SUITES.REGRESSION]: 'primary',
      [TEST_SUITES.SANITY]: 'warning',
      [TEST_SUITES.PERFORMANCE]: 'secondary',
    };
    return colors[suite] || 'default';
  };

  const handleEnvironmentDialogOpen = () => {
    setCurrentEnvironment({
      name: '',
      baseUrl: '',
      parameters: {}
    });
    setIsEnvironmentDialogOpen(true);
  };

  const handleEnvironmentDialogClose = () => {
    setIsEnvironmentDialogOpen(false);
  };

  const handleEnvironmentSave = () => {
    if (currentEnvironment.name && currentEnvironment.baseUrl) {
      try {
        const updatedEnvironments = [...environments];
        const existingIndex = updatedEnvironments.findIndex(env => env.name === currentEnvironment.name);
        
        if (existingIndex >= 0) {
          updatedEnvironments[existingIndex] = currentEnvironment;
        } else {
          updatedEnvironments.push(currentEnvironment);
        }

        setEnvironments(updatedEnvironments);
        localStorage.setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.stringify(updatedEnvironments));
        
        if (!selectedEnvironment) {
          setSelectedEnvironment(currentEnvironment.name);
        }

        setIsEnvironmentDialogOpen(false);
        enqueueSnackbar('Environment saved successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Error saving environment', { variant: 'error' });
      }
    } else {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
    }
  };

  const handleEnvironmentDelete = (name: string) => {
    try {
      const updatedEnvironments = environments.filter(env => env.name !== name);
      setEnvironments(updatedEnvironments);
      localStorage.setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.stringify(updatedEnvironments));
      
      if (selectedEnvironment === name) {
        setSelectedEnvironment(updatedEnvironments.length > 0 ? updatedEnvironments[0].name : '');
      }
      
      enqueueSnackbar('Environment deleted successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error deleting environment', { variant: 'error' });
    }
  };

  const handleEnvironmentEdit = (environment: Environment) => {
    setCurrentEnvironment(environment);
    setIsEnvironmentDialogOpen(true);
  };

  const handleEnvironmentChange = (event: SelectChangeEvent) => {
    const newEnvironment = event.target.value;
    setSelectedEnvironment(newEnvironment);
    localStorage.setItem(STORAGE_KEYS.SELECTED_ENVIRONMENT, newEnvironment);
  };

  const handleSectionToggle = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleMfaRequestRun = async () => {
    try {
      const response: Response = await fetch(mfaRequest.endpoint, {
        method: mfaRequest.method,
        headers: JSON.parse(mfaRequest.headers || '{}'),
        body: mfaRequest.body ? JSON.parse(mfaRequest.body) : undefined
      });

      if (response.status === mfaRequest.expectedStatus) {
        const responseData: Record<string, unknown> = await response.json();
        
        // Store response data in localStorage
        localStorage.setItem('mfa_response', JSON.stringify(responseData));

        // Store cookies in localStorage
        const cookies = response.headers.get('set-cookie');
        localStorage.setItem('mfa_cookies', JSON.stringify(cookies));

        setMfaRequest(prev => ({
          ...prev,
          responseVariables: Object.entries(responseData).map(([name, value]) => ({ 
            name, 
            value: typeof value === 'string' ? value : JSON.stringify(value)
          })),
          cookieVariables: cookies?.split(';').map((cookie: string) => {
            const [name, value] = cookie.split('=');
            return { name: name.trim(), cookieName: value.trim() };
          }) || []
        }));

        enqueueSnackbar('MFA request executed successfully', { variant: 'success' });
      } else {
        throw new Error(`Expected status ${mfaRequest.expectedStatus}, got ${response.status}`);
      }
    } catch (error) {
      console.error('Error running MFA request:', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'Error running MFA request', { variant: 'error' });
    }
  };

  const handleStoreResponseVariable = (variable: { name: string; value: string }) => {
    const savedVariables = localStorage.getItem('stored_response_variables') || '[]';
    const variables = JSON.parse(savedVariables);
    variables.push(variable);
    localStorage.setItem('stored_response_variables', JSON.stringify(variables));
    enqueueSnackbar('Response variable stored successfully', { variant: 'success' });
  };

  const handleStoreCookieVariable = (variable: { name: string; cookieName: string }) => {
    const savedVariables = localStorage.getItem('stored_cookie_variables') || '[]';
    const variables = JSON.parse(savedVariables);
    variables.push(variable);
    localStorage.setItem('stored_cookie_variables', JSON.stringify(variables));
    enqueueSnackbar('Cookie variable stored successfully', { variant: 'success' });
  };

  // Add this function to remove stored variables
  const handleRemoveStoredVariable = (type: 'response' | 'cookie', index: number) => {
    if (type === 'response') {
      const updatedVars = [...storedResponseVariables];
      updatedVars.splice(index, 1);
      setStoredResponseVariables(updatedVars);
      localStorage.setItem('stored_response_variables', JSON.stringify(updatedVars));
    } else {
      const updatedVars = [...storedCookieVariables];
      updatedVars.splice(index, 1);
      setStoredCookieVariables(updatedVars);
      localStorage.setItem('stored_cookie_variables', JSON.stringify(updatedVars));
    }
    enqueueSnackbar('Variable removed successfully', { variant: 'success' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* Left Column - Basic Settings and MFA */}
          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  Basic Settings
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name="baseUrl"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TextField
                            {...field}
                            fullWidth
                            required
                            label="Base URL"
                            variant="outlined"
                            size="small"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                          <Tooltip title="The base URL for your API endpoints">
                            <IconButton sx={{ ml: 1 }}>
                              <HelpOutlineIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="bearerToken"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Bearer Token"
                          variant="outlined"
                          size="small"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="testUserEmail"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          required
                          label="Test User Email"
                          variant="outlined"
                          size="small"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="testUserPassword"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          required
                          label="Test User Password"
                          type="password"
                          variant="outlined"
                          size="small"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  MFA Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="mfaEnabled"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onChange={(e) => {
                                field.onChange(e);
                                setMfaConfig(prev => ({
                                  ...prev,
                                  enabled: e.target.checked
                                }));
                              }}
                            />
                          )}
                        />
                      }
                      label="Enable MFA"
                    />
                  </Grid>

                  {watch('mfaEnabled') && (
                    <>
                      <Grid item xs={12}>
                        <Controller
                          name="mfaSecretKey"
                          control={control}
                          render={({ field }) => (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TextField
                                {...field}
                                fullWidth
                                label="MFA Secret Key"
                                type="password"
                                variant="outlined"
                                size="small"
                                error={!!mfaConfig.error}
                                helperText={mfaConfig.error || "Enter your MFA secret key"}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleMfaSecretChange(e.target.value);
                                }}
                              />
                              <Tooltip title="Your MFA secret key for generating TOTP codes">
                                <IconButton sx={{ ml: 1 }}>
                                  <HelpOutlineIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        />
                      </Grid>

                      {mfaConfig.secretKey && mfaConfig.isValid && (
                        <Grid item xs={12}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle1">
                                  Current TOTP Code
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                                    {mfaConfig.currentCode}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      navigator.clipboard.writeText(mfaConfig.currentCode);
                                      enqueueSnackbar('TOTP code copied to clipboard', { variant: 'success' });
                                    }}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                  <CircularProgress
                                    variant="determinate"
                                    value={(mfaConfig.remainingTime / 30) * 100}
                                    size={20}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {mfaConfig.remainingTime}s
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}

                      {/* MFA Request Configuration */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" gutterBottom sx={{ color: 'primary.main' }}>
                          MFA Request Configuration
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Request Name"
                          value={mfaRequest.name}
                          onChange={(e) => setMfaRequest(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Method</InputLabel>
                          <Select
                            value={mfaRequest.method}
                            label="Method"
                            onChange={(e) => setMfaRequest(prev => ({ ...prev, method: e.target.value }))}
                          >
                            <MenuItem value="POST">POST</MenuItem>
                            <MenuItem value="PUT">PUT</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Expected Status"
                          type="number"
                          value={mfaRequest.expectedStatus}
                          onChange={(e) => setMfaRequest(prev => ({ ...prev, expectedStatus: parseInt(e.target.value) }))}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Endpoint"
                          value={mfaRequest.endpoint}
                          onChange={(e) => setMfaRequest(prev => ({ ...prev, endpoint: e.target.value }))}
                          helperText="Use {totpCode} to reference the current TOTP code"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Headers"
                          multiline
                          rows={3}
                          value={mfaRequest.headers}
                          onChange={(e) => setMfaRequest(prev => ({ ...prev, headers: e.target.value }))}
                          helperText="Enter headers in JSON format"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Request Body"
                          multiline
                          rows={3}
                          value={mfaRequest.body}
                          onChange={(e) => setMfaRequest(prev => ({ ...prev, body: e.target.value }))}
                          helperText="Enter request body in JSON format. Use {totpCode} to reference the current TOTP code"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          onClick={handleMfaRequestRun}
                          startIcon={<PlayArrowIcon />}
                        >
                          Run MFA Request
                        </Button>
                      </Grid>

                      {/* Response Variables Section */}
                      {mfaRequest.responseVariables.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle1" gutterBottom>
                            Response Variables
                          </Typography>
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
                                {mfaRequest.responseVariables.map((variable, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{variable.name}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography sx={{ fontFamily: 'monospace' }}>
                                          {variable.value}
                                        </Typography>
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            navigator.clipboard.writeText(variable.value);
                                            enqueueSnackbar('Value copied to clipboard', { variant: 'success' });
                                          }}
                                        >
                                          <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleStoreResponseVariable(variable)}
                                      >
                                        Store Variable
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Grid>
                      )}

                      {/* Cookie Variables Section */}
                      {mfaRequest.cookieVariables.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle1" gutterBottom>
                            Cookie Variables
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Name</TableCell>
                                  <TableCell>Cookie Name</TableCell>
                                  <TableCell>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {mfaRequest.cookieVariables.map((variable, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{variable.name}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography sx={{ fontFamily: 'monospace' }}>
                                          {variable.cookieName}
                                        </Typography>
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            navigator.clipboard.writeText(variable.cookieName);
                                            enqueueSnackbar('Cookie name copied to clipboard', { variant: 'success' });
                                          }}
                                        >
                                          <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleStoreCookieVariable(variable)}
                                      >
                                        Store Variable
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Grid>
                      )}

                      {/* Stored Variables Section */}
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                          Stored Variables
                        </Typography>
                        
                        {/* Stored Response Variables */}
                        {storedResponseVariables.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Stored Response Variables
                            </Typography>
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
                                  {storedResponseVariables.map((variable, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{variable.name}</TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <Typography sx={{ fontFamily: 'monospace' }}>
                                            {variable.value}
                                          </Typography>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              navigator.clipboard.writeText(variable.value);
                                              enqueueSnackbar('Value copied to clipboard', { variant: 'success' });
                                            }}
                                          >
                                            <ContentCopyIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleRemoveStoredVariable('response', index)}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        )}

                        {/* Stored Cookie Variables */}
                        {storedCookieVariables.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Stored Cookie Variables
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Cookie Name</TableCell>
                                    <TableCell>Actions</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {storedCookieVariables.map((variable, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{variable.name}</TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <Typography sx={{ fontFamily: 'monospace' }}>
                                            {variable.cookieName}
                                          </Typography>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              navigator.clipboard.writeText(variable.cookieName);
                                              enqueueSnackbar('Cookie name copied to clipboard', { variant: 'success' });
                                            }}
                                          >
                                            <ContentCopyIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleRemoveStoredVariable('cookie', index)}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        )}
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Environment and API Requests */}
          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Environment Configuration
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleEnvironmentDialogOpen}
                  >
                    Add Environment
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Environment</InputLabel>
                      <Select
                        value={selectedEnvironment}
                        label="Select Environment"
                        onChange={handleEnvironmentChange}
                      >
                        {environments.map((env) => (
                          <MenuItem key={env.name} value={env.name}>
                            {env.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {selectedEnvironment && (
                    <Grid item xs={12}>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Environment</TableCell>
                              <TableCell>Base URL</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {environments
                              .filter(env => env.name === selectedEnvironment)
                              .map((env) => (
                                <TableRow key={env.name}>
                                  <TableCell>{env.name}</TableCell>
                                  <TableCell>{env.baseUrl}</TableCell>
                                  <TableCell>
                                    <IconButton size="small" onClick={() => handleEnvironmentEdit(env)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleEnvironmentDelete(env.name)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <LoadingButton
            type="submit"
            variant="contained"
            size="large"
            loading={isSaving}
            loadingPosition="start"
            startIcon={<SaveIcon />}
            sx={{
              borderRadius: 2,
              px: 4,
              py: 1.5,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 8px rgba(0,0,0,0.2)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            Save Configuration
          </LoadingButton>
        </Box>

        <Dialog open={isEnvironmentDialogOpen} onClose={handleEnvironmentDialogClose} maxWidth="md" fullWidth>
          <DialogTitle>{currentEnvironment.name ? 'Edit' : 'Add'} Environment</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Environment Name"
                  value={currentEnvironment.name}
                  onChange={(e) => setCurrentEnvironment({ ...currentEnvironment, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Base URL"
                  value={currentEnvironment.baseUrl}
                  onChange={(e) => setCurrentEnvironment({ ...currentEnvironment, baseUrl: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Environment Parameters
                </Typography>
                {Object.entries(currentEnvironment.parameters).map(([key, value], index) => (
                  <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label="Parameter Name"
                        value={key}
                        onChange={(e) => {
                          const newParameters = { ...currentEnvironment.parameters };
                          const newKey = e.target.value;
                          if (newKey !== key) {
                            delete newParameters[key];
                            newParameters[newKey] = value;
                            setCurrentEnvironment(prev => ({
                              ...prev,
                              parameters: newParameters
                            }));
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label="Parameter Value"
                        value={value}
                        onChange={(e) => {
                          const newParameters = { ...currentEnvironment.parameters };
                          newParameters[key] = e.target.value;
                          setCurrentEnvironment(prev => ({
                            ...prev,
                            parameters: newParameters
                          }));
                        }}
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <IconButton
                        onClick={() => {
                          const newParameters = { ...currentEnvironment.parameters };
                          delete newParameters[key];
                          setCurrentEnvironment(prev => ({
                            ...prev,
                            parameters: newParameters
                          }));
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newParameters = { ...currentEnvironment.parameters };
                    newParameters[`param${Object.keys(newParameters).length + 1}`] = '';
                    setCurrentEnvironment({ ...currentEnvironment, parameters: newParameters });
                  }}
                >
                  Add Parameter
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEnvironmentDialogClose}>Cancel</Button>
            <Button onClick={handleEnvironmentSave} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
}

export default ConfigurationPanel;