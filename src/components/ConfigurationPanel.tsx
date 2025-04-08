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
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useForm, Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import * as XLSX from 'xlsx';
import { TOTP } from 'otpauth';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface Assertion {
  field: string;
  operator: string;
  value: string;
  type: string;
  validationType?: 'value' | 'schema';
  schema?: string;
}

interface ConfigFormData {
  baseUrl: string;
  testUserEmail: string;
  testUserPassword: string;
  mfaEnabled: boolean;
  mfaSecretKey: string;
  bearerToken: string;
  currentTotpCode: string;
  cookies: string;
}

export interface ApiRequest {
  name: string;
  method: string;
  endpoint: string;
  headers: string;
  body: string;
  expectedStatus: number;
  suite: string;
  assertions: Assertion[];
}

interface ExpandedState {
  [key: number]: boolean;
}

interface TestStatus {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
  suite: string;
  logs: string;
  method: string;
  endpoint: string;
  headers: string;
  body: string;
  expectedStatus: number;
  isExpanded: boolean;
  assertions?: Assertion[];
  assertionResults?: {
    field: string;
    expected: string;
    actual: any;
    passed: boolean;
    message: string;
  }[];
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

interface TestVariables {
  testName: string;
  variables: Variable[];
  cookies?: Cookie[];
  bearerToken?: string;
}

const defaultApiRequest: ApiRequest = {
  name: '',
  method: 'GET',
  endpoint: '',
  headers: '{}',
  body: '{}',
  expectedStatus: 200,
  suite: 'regression',
  assertions: [],
};

const STORAGE_KEYS = {
  CONFIG: 'test_automation_config',
  API_REQUESTS: 'test_automation_api_requests',
  TEST_STATUS: 'test_automation_status'
};

export const TEST_SUITES = {
  SMOKE: 'smoke',
  REGRESSION: 'regression',
  SANITY: 'sanity',
  PERFORMANCE: 'performance',
};

function ConfigurationPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [apiRequests, setApiRequests] = useState<ApiRequest[]>([]);
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);
  const [currentApiRequest, setCurrentApiRequest] = useState<ApiRequest>(defaultApiRequest);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [currentTotpCode, setCurrentTotpCode] = useState<string>('');
  const [lastGenerated, setLastGenerated] = useState<number>(0);
  const [testCookies, setTestCookies] = useState<TestCookies[]>([]);
  const [testVariables, setTestVariables] = useState<TestVariables[]>([]);

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
    },
  });

  const bearerToken = watch('bearerToken');

  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
        const savedRequests = localStorage.getItem(STORAGE_KEYS.API_REQUESTS);

        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          reset(parsedConfig);
        }

        if (savedRequests) {
          setApiRequests(JSON.parse(savedRequests));
        }
      } catch (error) {
        enqueueSnackbar('Error loading saved configuration', { variant: 'error' });
      }
    };

    loadSavedData();
  }, [reset, enqueueSnackbar]);

  // Generate TOTP code every 30 seconds
  useEffect(() => {
    const generateTotpCode = () => {
      const mfaSecretKey = watch('mfaSecretKey');
      const mfaEnabled = watch('mfaEnabled');
      
      if (mfaEnabled && mfaSecretKey) {
        const now = Date.now();
        if (now - lastGenerated >= 30000) { // 30 seconds
          try {
            const totp = new TOTP({
              secret: mfaSecretKey,
              algorithm: 'SHA1',
              digits: 6,
              period: 30
            });
            const code = totp.generate();
            setCurrentTotpCode(code);
            setLastGenerated(now);
          } catch (error) {
            console.error('Error generating TOTP:', error);
          }
        }
      }
    };

    const interval = setInterval(generateTotpCode, 1000);
    return () => clearInterval(interval);
  }, [watch, lastGenerated]);

  // Listen for cookie updates from ExecutionPanel
  useEffect(() => {
    const handleCookieUpdate = (event: CustomEvent) => {
      const { testName, cookies } = event.detail;
      if (cookies && cookies.length > 0) {
        setTestCookies(prevCookies => {
          const existingTestIndex = prevCookies.findIndex(tc => tc.testName === testName);
          if (existingTestIndex >= 0) {
            const updated = [...prevCookies];
            updated[existingTestIndex] = { testName, cookies };
            return updated;
          }
          return [...prevCookies, { testName, cookies }];
        });
        enqueueSnackbar(`New cookies captured from test: ${testName}`, { variant: 'success' });
      }
    };

    window.addEventListener('test_cookies_updated', handleCookieUpdate as EventListener);
    return () => {
      window.removeEventListener('test_cookies_updated', handleCookieUpdate as EventListener);
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

  // Listen for Bearer token updates
  useEffect(() => {
    const handleBearerTokenUpdate = (event: CustomEvent) => {
      const { testName, bearerToken } = event.detail;
      if (bearerToken) {
        setTestVariables(prevVariables => {
          const existingTestIndex = prevVariables.findIndex(v => v.testName === testName);
          if (existingTestIndex >= 0) {
            const updated = [...prevVariables];
            updated[existingTestIndex] = { ...updated[existingTestIndex], bearerToken };
            return updated;
          }
          return [...prevVariables, { testName, variables: [], bearerToken }];
        });
        enqueueSnackbar(`Bearer token captured from test: ${testName}`, { variant: 'success' });
      }
    };

    window.addEventListener('bearer_token_updated', handleBearerTokenUpdate as EventListener);
    return () => {
      window.removeEventListener('bearer_token_updated', handleBearerTokenUpdate as EventListener);
    };
  }, [enqueueSnackbar]);

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

  const handleApiRequestSave = () => {
    if (currentApiRequest.name && currentApiRequest.endpoint) {
      try {
        // Validate schema if schema validation is selected
        const assertions = currentApiRequest.assertions?.map(assertion => {
          if (assertion.validationType === 'schema' && assertion.schema) {
            try {
              // Validate JSON schema format
              JSON.parse(assertion.schema);
              return {
                ...assertion,
                schema: assertion.schema
              };
            } catch (error) {
              throw new Error(`Invalid JSON Schema in assertion for field ${assertion.field}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          return assertion;
        }) || [];

        // Check for response variables in the body and headers
        const bodyWithVariables = replaceResponseVariables(currentApiRequest.body);
        const headersWithVariables = replaceResponseVariables(currentApiRequest.headers);

        const newRequest: ApiRequest = {
          name: currentApiRequest.name,
          method: currentApiRequest.method,
          endpoint: currentApiRequest.endpoint,
          headers: headersWithVariables,
          body: bodyWithVariables,
          expectedStatus: currentApiRequest.expectedStatus,
          suite: currentApiRequest.suite,
          assertions
        };

        const savedRequests = localStorage.getItem(STORAGE_KEYS.API_REQUESTS);
        const requests: ApiRequest[] = savedRequests ? JSON.parse(savedRequests) : [];
        
        const existingIndex = requests.findIndex(r => r.name === newRequest.name);
        if (existingIndex >= 0) {
          requests[existingIndex] = newRequest;
        } else {
          requests.push(newRequest);
        }

        localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(requests));

        // Also update test status if it exists
        const savedStatus = localStorage.getItem(STORAGE_KEYS.TEST_STATUS);
        if (savedStatus) {
          const status: TestStatus[] = JSON.parse(savedStatus);
          const existingStatusIndex = status.findIndex(s => s.name === newRequest.name);
          if (existingStatusIndex >= 0) {
            status[existingStatusIndex] = {
              ...status[existingStatusIndex],
              method: newRequest.method,
              endpoint: newRequest.endpoint,
              headers: newRequest.headers,
              body: newRequest.body,
              expectedStatus: newRequest.expectedStatus,
              suite: newRequest.suite,
              assertions: newRequest.assertions || []
            };
            localStorage.setItem(STORAGE_KEYS.TEST_STATUS, JSON.stringify(status));
          }
        }

        setIsApiDialogOpen(false);
        setCurrentApiRequest(defaultApiRequest);
        enqueueSnackbar('Test request saved successfully', { variant: 'success' });
      } catch (error) {
        console.error('Error saving test request:', error);
        enqueueSnackbar(error instanceof Error ? error.message : 'Error saving test request', { variant: 'error' });
      }
    } else {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
    }
  };

  const replaceResponseVariables = (content: string): string => {
    // Replace variables in format ${response.testName.field}
    return content.replace(/\${response\.([^.]+)\.([^}]+)}/g, (match, testName, field) => {
      try {
        const storedResponse = localStorage.getItem(`response_${testName}`);
        if (storedResponse) {
          const responseData = JSON.parse(storedResponse);
          return responseData[field] || match;
        }
      } catch (error) {
        console.error(`Error accessing stored response for ${testName}:`, error);
      }
      return match;
    });
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

  const getSuiteColor = (suite: string) => {
    const colors: { [key: string]: string } = {
      [TEST_SUITES.SMOKE]: 'success',
      [TEST_SUITES.REGRESSION]: 'primary',
      [TEST_SUITES.SANITY]: 'warning',
      [TEST_SUITES.PERFORMANCE]: 'secondary',
    };
    return colors[suite] || 'default';
  };

  const downloadTemplate = () => {
    try {
      const template = [
        {
          name: 'Example GET Request',
          method: 'GET',
          endpoint: '/api/example',
          headers: '{"Authorization": "Bearer ${token}"}',
          body: '{}',
          expectedStatus: 200,
          suite: TEST_SUITES.REGRESSION,
        },
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Test Configuration
        </Typography>
        
        <Card sx={{ mb: 4, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="text.secondary">
              Basic Settings
            </Typography>
            
            <Grid container spacing={3}>
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
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="text.secondary">
              MFA Configuration
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Controller
                      name="mfaEnabled"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
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
                        <TextField
                          {...field}
                          fullWidth
                          label="MFA Secret Key"
                          type="password"
                          helperText="Enter your MFA secret key"
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Current TOTP Code"
                      value={currentTotpCode}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <IconButton
                            onClick={() => {
                              navigator.clipboard.writeText(currentTotpCode);
                              enqueueSnackbar('TOTP code copied to clipboard', { variant: 'success' });
                            }}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        )
                      }}
                      helperText="This code refreshes every 30 seconds"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="cookies"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Cookies"
                          multiline
                          rows={4}
                          helperText="Cookies will be automatically captured after MFA login"
                          InputProps={{
                            readOnly: true,
                            endAdornment: (
                              <IconButton
                                onClick={() => {
                                  navigator.clipboard.writeText(field.value);
                                  enqueueSnackbar('Cookies copied to clipboard', { variant: 'success' });
                                }}
                              >
                                <ContentCopyIcon />
                              </IconButton>
                            )
                          }}
                        />
                      )}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" color="text.secondary">
                API Requests Configuration
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadTemplate}
                  sx={{ mr: 2 }}
                >
                  Download Template
                </Button>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  sx={{ mr: 2 }}
                >
                  Import Excel
                  <input
                    type="file"
                    hidden
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleApiDialogOpen}
                >
                  Add Request
                </Button>
              </Box>
            </Box>

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="40px"></TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Suite</TableCell>
                    <TableCell>Expected Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiRequests.map((request, index) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell>
                          <IconButton size="small" onClick={() => toggleExpand(index)}>
                            {expanded[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{request.name}</TableCell>
                        <TableCell>{request.method}</TableCell>
                        <TableCell>{request.endpoint}</TableCell>
                        <TableCell>
                          <Chip 
                            label={request.suite} 
                            color={getSuiteColor(request.suite) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{request.expectedStatus}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              color="primary"
                              onClick={() => handleEditApiRequest(index)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteApiRequest(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                          <Collapse in={expanded[index]} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1 }}>
                              <Typography variant="h6" gutterBottom component="div">
                                Request Details
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2">Headers:</Typography>
                                  <pre style={{ 
                                    backgroundColor: '#f5f5f5',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    overflow: 'auto'
                                  }}>
                                    {request.headers}
                                  </pre>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2">Body:</Typography>
                                  <pre style={{ 
                                    backgroundColor: '#f5f5f5',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    overflow: 'auto'
                                  }}>
                                    {request.body}
                                  </pre>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {testCookies.length > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="text.secondary">
                Test Cookies
              </Typography>
              <Grid container spacing={3}>
                {testCookies.map((testCookie) => (
                  <Grid item xs={12} key={testCookie.testName}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{testCookie.testName}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer component={Paper}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Domain</TableCell>
                                <TableCell>Path</TableCell>
                                <TableCell>Expires</TableCell>
                                <TableCell>Secure</TableCell>
                                <TableCell>HttpOnly</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {testCookie.cookies.map((cookie, index) => (
                                <TableRow key={index}>
                                  <TableCell>{cookie.name}</TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Typography sx={{ fontFamily: 'monospace' }}>
                                        {cookie.value}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          navigator.clipboard.writeText(cookie.value);
                                          enqueueSnackbar('Cookie value copied to clipboard', { variant: 'success' });
                                        }}
                                      >
                                        <ContentCopyIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                  <TableCell>{cookie.domain}</TableCell>
                                  <TableCell>{cookie.path}</TableCell>
                                  <TableCell>{cookie.expires || '-'}</TableCell>
                                  <TableCell>{cookie.secure ? 'Yes' : 'No'}</TableCell>
                                  <TableCell>{cookie.httpOnly ? 'Yes' : 'No'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {testVariables.length > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="text.secondary">
                Test Variables
              </Typography>
              <Grid container spacing={3}>
                {testVariables.map((testVar) => (
                  <Grid item xs={12} key={testVar.testName}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{testVar.testName}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {testVar.bearerToken && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Bearer Token
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontFamily: 'monospace' }}>
                                {testVar.bearerToken}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  navigator.clipboard.writeText(testVar.bearerToken || '');
                                  enqueueSnackbar('Bearer token copied to clipboard', { variant: 'success' });
                                }}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        )}
                        {/* ... existing variables table ... */}
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
      </Box>

      <Dialog open={isApiDialogOpen} onClose={handleApiDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Edit' : 'Add'} API Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Request Name"
                value={currentApiRequest.name}
                onChange={(e) => setCurrentApiRequest({ ...currentApiRequest, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Method</InputLabel>
                <Select
                  value={currentApiRequest.method}
                  label="Method"
                  onChange={(e) => setCurrentApiRequest({ ...currentApiRequest, method: e.target.value })}
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
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Headers"
                multiline
                rows={3}
                value={currentApiRequest.headers}
                onChange={(e) => setCurrentApiRequest({ ...currentApiRequest, headers: e.target.value })}
                helperText="Enter headers in JSON format"
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
              <Typography variant="h6" gutterBottom>
                Assertions
              </Typography>
              <Box sx={{ mb: 2 }}>
                {currentApiRequest.assertions?.map((assertion, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      fullWidth
                      label="Field Path"
                      value={assertion.field}
                      onChange={(e) => {
                        const newAssertions = [...(currentApiRequest.assertions || [])];
                        newAssertions[index].field = e.target.value;
                        setCurrentApiRequest({ ...currentApiRequest, assertions: newAssertions });
                      }}
                      placeholder="e.g., data.user.id"
                    />
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>Validation Type</InputLabel>
                      <Select
                        value={assertion.validationType || 'value'}
                        label="Validation Type"
                        onChange={(e) => {
                          const newAssertions = [...(currentApiRequest.assertions || [])];
                          newAssertions[index].validationType = e.target.value as 'value' | 'schema';
                          setCurrentApiRequest({ ...currentApiRequest, assertions: newAssertions });
                        }}
                      >
                        <MenuItem value="value">Value</MenuItem>
                        <MenuItem value="schema">Schema</MenuItem>
                      </Select>
                    </FormControl>
                    {assertion.validationType === 'value' ? (
                      <>
                        <FormControl sx={{ minWidth: 120 }}>
                          <InputLabel>Operator</InputLabel>
                          <Select
                            value={assertion.operator}
                            label="Operator"
                            onChange={(e) => {
                              const newAssertions = [...(currentApiRequest.assertions || [])];
                              newAssertions[index].operator = e.target.value;
                              setCurrentApiRequest({ ...currentApiRequest, assertions: newAssertions });
                            }}
                          >
                            <MenuItem value="equals">Equals</MenuItem>
                            <MenuItem value="notEquals">Not Equals</MenuItem>
                            <MenuItem value="contains">Contains</MenuItem>
                            <MenuItem value="notContains">Not Contains</MenuItem>
                            <MenuItem value="greaterThan">Greater Than</MenuItem>
                            <MenuItem value="lessThan">Less Than</MenuItem>
                            <MenuItem value="exists">Exists</MenuItem>
                            <MenuItem value="notExists">Not Exists</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          fullWidth
                          label="Expected Value"
                          value={assertion.value}
                          onChange={(e) => {
                            const newAssertions = [...(currentApiRequest.assertions || [])];
                            newAssertions[index].value = e.target.value;
                            setCurrentApiRequest({ ...currentApiRequest, assertions: newAssertions });
                          }}
                          placeholder="Expected value"
                        />
                      </>
                    ) : (
                      <TextField
                        fullWidth
                        label="JSON Schema"
                        multiline
                        rows={4}
                        value={assertion.schema || ''}
                        onChange={(e) => {
                          const newAssertions = [...(currentApiRequest.assertions || [])];
                          newAssertions[index].schema = e.target.value;
                          setCurrentApiRequest({ ...currentApiRequest, assertions: newAssertions });
                        }}
                        placeholder="Enter JSON Schema for validation"
                        helperText="Enter a valid JSON Schema to validate the field"
                      />
                    )}
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={assertion.type}
                        label="Type"
                        onChange={(e) => {
                          const newAssertions = [...(currentApiRequest.assertions || [])];
                          newAssertions[index].type = e.target.value;
                          setCurrentApiRequest({ ...currentApiRequest, assertions: newAssertions });
                        }}
                      >
                        <MenuItem value="string">String</MenuItem>
                        <MenuItem value="number">Number</MenuItem>
                        <MenuItem value="boolean">Boolean</MenuItem>
                        <MenuItem value="array">Array</MenuItem>
                        <MenuItem value="object">Object</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton
                      color="error"
                      onClick={() => {
                        const newAssertions = (currentApiRequest.assertions || []).filter((_, i) => i !== index);
                        setCurrentApiRequest({ ...currentApiRequest, assertions: newAssertions });
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => {
                    setCurrentApiRequest({
                      ...currentApiRequest,
                      assertions: [
                        ...(currentApiRequest.assertions || []),
                        { 
                          field: '', 
                          operator: 'equals', 
                          value: '', 
                          type: 'string',
                          validationType: 'value'
                        }
                      ]
                    });
                  }}
                >
                  Add Assertion
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleApiDialogClose}>Cancel</Button>
          <Button onClick={handleApiRequestSave} variant="contained" color="primary">
            Save Request
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}

export default ConfigurationPanel;