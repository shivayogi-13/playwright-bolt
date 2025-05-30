import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Checkbox,
  ListItemIcon,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { ApiRequest, TEST_SUITES } from './ConfigurationPanel';
import { LoadingButton } from '@mui/lab';
import Ajv from 'ajv';

interface Assertion {
  field: string;
  operator: string;
  value: string;
  type: string;
  validationType?: string;
  schema?: string;
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
  cookies?: string;
}

interface Variable {
  name: string;
  value: any;
  source: string;
  timestamp: string;
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

interface TestVariables {
  testName: string;
  variables: Variable[];
  cookies?: Cookie[];
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  suite: string;
  timestamp: string;
}

interface TestVariable {
  testName: string;
  variables: Array<{
    name: string;
    value: string;
    source: string;
    timestamp: string;
  }>;
}

interface Environment {
  name: string;
  baseUrl: string;
  parameters: Record<string, string>;
}

const STORAGE_KEYS = {
  TEST_VARIABLES: 'test_automation_variables',
  TEST_STATUS: 'test_automation_status',
  SELECTED_TESTS: 'test_automation_selected_tests',
  SELECTED_SUITE: 'test_automation_selected_suite',
  API_REQUESTS: 'test_automation_api_requests',
  TEST_LOGS: 'test_automation_logs',
  CONFIG: 'test_automation_config',
  ENVIRONMENTS: 'test_automation_environments'
};

const ajv = new Ajv();

function ExecutionPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [tests, setTests] = useState<TestStatus[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [variablesExpanded, setVariablesExpanded] = useState(true);
  const [logs, setLogs] = useState<{ [key: string]: string[] }>({});
  const [testVariables, setTestVariables] = useState<TestVariables[]>([]);
  const [authType, setAuthType] = useState<'mfa' | 'bearer'>('mfa');
  const [mfaSecret, setMfaSecret] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');

  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedEnvironments = localStorage.getItem(STORAGE_KEYS.ENVIRONMENTS);
        if (savedEnvironments) {
          const parsedEnvironments = JSON.parse(savedEnvironments);
          setEnvironments(parsedEnvironments);
          if (parsedEnvironments.length > 0) {
            setSelectedEnvironment(parsedEnvironments[0].name);
          }
        }
      } catch (error) {
        enqueueSnackbar('Error loading environments', { variant: 'error' });
      }
    };

    loadSavedData();
  }, [enqueueSnackbar]);

  // Load saved variables on mount and when storage changes
  useEffect(() => {
    const loadVariables = () => {
      const savedVariables = localStorage.getItem(STORAGE_KEYS.TEST_VARIABLES);
      if (savedVariables) {
        try {
          const parsedVariables = JSON.parse(savedVariables);
          console.log('Loading saved variables:', parsedVariables);
          setTestVariables(parsedVariables);
        } catch (error) {
          console.error('Error loading saved variables:', error);
        }
      }
    };

    // Load variables immediately
    loadVariables();

    // Add storage event listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.TEST_VARIABLES) {
        console.log('Storage event triggered for variables');
        loadVariables();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save variables when they change
  useEffect(() => {
    if (testVariables.length > 0) {
      console.log('Saving variables:', testVariables);
      localStorage.setItem(STORAGE_KEYS.TEST_VARIABLES, JSON.stringify(testVariables));
    }
  }, [testVariables]);

  // Load saved logs on mount
  useEffect(() => {
    const loadLogs = () => {
      const savedLogs = localStorage.getItem(STORAGE_KEYS.TEST_LOGS);
      if (savedLogs) {
        try {
          const parsedLogs = JSON.parse(savedLogs);
          console.log('Loading saved logs:', parsedLogs);
          setLogs(parsedLogs);
        } catch (error) {
          console.error('Error loading saved logs:', error);
        }
      }
    };

    // Load logs immediately
    loadLogs();

    // Add storage event listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.TEST_LOGS) {
        console.log('Storage event triggered for logs');
        loadLogs();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save logs when they change
  useEffect(() => {
    if (Object.keys(logs).length > 0) {
      console.log('Saving logs:', logs);
      localStorage.setItem(STORAGE_KEYS.TEST_LOGS, JSON.stringify(logs));
    }
  }, [logs]);

  // Load saved test status and logs on mount
  useEffect(() => {
    const loadTestStatus = () => {
      const savedStatus = localStorage.getItem(STORAGE_KEYS.TEST_STATUS);
      if (savedStatus) {
        try {
          const parsedStatus = JSON.parse(savedStatus);
          console.log('Loading saved test status:', parsedStatus);
          // Ensure isExpanded is preserved
          const testsWithExpanded = parsedStatus.map((test: TestStatus) => ({
            ...test,
            isExpanded: test.isExpanded || false
          }));
          setTests(testsWithExpanded);
        } catch (error) {
          console.error('Error loading saved test status:', error);
        }
      }
    };

    // Load test status immediately
    loadTestStatus();

    // Add storage event listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.TEST_STATUS) {
        console.log('Storage event triggered for test status');
        loadTestStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save test status when it changes
  useEffect(() => {
    if (tests.length > 0) {
      console.log('Saving test status:', tests);
      // Ensure we save the expanded state
      const testsToSave = tests.map(test => ({
        ...test,
        isExpanded: test.isExpanded || false
      }));
      localStorage.setItem(STORAGE_KEYS.TEST_STATUS, JSON.stringify(testsToSave));
    }
  }, [tests]);

  // Load MFA configuration on mount
  useEffect(() => {
    const loadMfaConfig = () => {
      const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Error loading MFA configuration:', error);
        }
      }
    };

    loadMfaConfig();

    // Listen for configuration changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CONFIG) {
        loadMfaConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadTests = () => {
    try {
      const savedRequests = localStorage.getItem(STORAGE_KEYS.API_REQUESTS);
      const savedStatus = localStorage.getItem(STORAGE_KEYS.TEST_STATUS);
      
      if (savedRequests) {
        const requests: ApiRequest[] = JSON.parse(savedRequests);
        const status: TestStatus[] = savedStatus ? JSON.parse(savedStatus) : [];
        
        // Create a map of existing test statuses
        const existingTests = new Map(
          status.map((test: TestStatus) => [test.name, test])
        );
        
        // Create new tests array with both existing and new tests
        const newTests: TestStatus[] = requests.map(request => {
          const existingTest = existingTests.get(request.name);
          if (existingTest) {
            return {
              ...existingTest,
              method: request.method,
              endpoint: request.endpoint,
              headers: request.headers,
              body: request.body,
              expectedStatus: request.expectedStatus,
              assertions: request.assertions || [],
              suite: request.suite || 'default'
            };
          }
          
          return {
            name: request.name,
            status: 'pending' as const,
            duration: 0,
            suite: request.suite || 'default',
            logs: '',
            method: request.method,
            endpoint: request.endpoint,
            headers: request.headers,
            body: request.body,
            expectedStatus: request.expectedStatus,
            isExpanded: false,
            assertions: request.assertions || []
          };
        });
        
        setTests(newTests);
        // Only show toast if there are tests loaded
        if (newTests.length > 0) {
          enqueueSnackbar('Tests loaded successfully', { variant: 'success' });
        } else {
          enqueueSnackbar('No tests found', { variant: 'info' });
        }
      } else {
        setTests([]);
        enqueueSnackbar('No tests found', { variant: 'info' });
      }
    } catch (error) {
      console.error('Error loading tests:', error);
      enqueueSnackbar('Error loading tests', { variant: 'error' });
    }
  };

  // Initialize component
  useEffect(() => {
    // Load tests on mount
    loadTests();

    // Load saved selected tests and suite
    const savedSelectedTests = localStorage.getItem(STORAGE_KEYS.SELECTED_TESTS);
    if (savedSelectedTests) {
      setSelectedTests(JSON.parse(savedSelectedTests));
    }

    const savedSelectedSuite = localStorage.getItem(STORAGE_KEYS.SELECTED_SUITE);
    if (savedSelectedSuite) {
      setSelectedSuite(savedSelectedSuite);
    }

    // Add event listeners for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.API_REQUESTS) {
        loadTests();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Add a message event listener for cross-tab communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RELOAD_TESTS') {
        loadTests();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Save selected tests and suite when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_TESTS, JSON.stringify(selectedTests));
    localStorage.setItem(STORAGE_KEYS.SELECTED_SUITE, selectedSuite);
  }, [selectedTests, selectedSuite]);

  // Save test status when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEST_STATUS, JSON.stringify(tests));
  }, [tests]);

  const extractVariablesFromResponse = (testName: string, response: any) => {
    try {
      const newVariables: Variable[] = [];
      
      // Extract top-level variables
      Object.entries(response).forEach(([key, value]) => {
        if (typeof value !== 'object' || value === null) {
          newVariables.push({
            name: `${testName}.${key}`,
            value,
            source: testName,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Extract nested variables
      const extractNested = (obj: any, prefix: string) => {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            extractNested(value, `${prefix}.${key}`);
          } else {
            newVariables.push({
              name: `${prefix}.${key}`,
              value,
              source: testName,
              timestamp: new Date().toISOString(),
            });
          }
        });
      };

      extractNested(response, testName);
      return newVariables;
    } catch (error) {
      console.error('Error extracting variables:', error);
      return [];
    }
  };

  const clearVariables = () => {
    if (window.confirm('Are you sure you want to clear all variables? This action cannot be undone.')) {
      setTestVariables([]);
      localStorage.removeItem(STORAGE_KEYS.TEST_VARIABLES);
      enqueueSnackbar('Variables cleared', { variant: 'info' });
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    if (!path || !obj) return undefined;
    try {
      return path.split('.').reduce((o, i) => {
        if (o === undefined || o === null) return undefined;
        return o[i];
      }, obj);
    } catch (error) {
      console.error('Error getting value by path:', error);
      return undefined;
    }
  };

  const compareValues = (actual: any, expected: any, operator: string) => {
    if (actual === undefined || actual === null) {
      return operator === 'exists' ? false : false;
    }

    try {
      switch (operator) {
        case 'equals':
          return String(actual) === String(expected);
        case 'contains':
          return String(actual).includes(String(expected));
        case 'matches':
          return new RegExp(String(expected)).test(String(actual));
        case 'exists':
          return actual !== undefined && actual !== null;
        case 'notEquals':
          return String(actual) !== String(expected);
        case 'notContains':
          return !String(actual).includes(String(expected));
        case 'greaterThan':
          return Number(actual) > Number(expected);
        case 'lessThan':
          return Number(actual) < Number(expected);
        case 'notExists':
          return actual === undefined || actual === null;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error comparing values:', error);
      return false;
    }
  };

  const validateAssertions = async (response: any, assertions: Assertion[]): Promise<TestStatus['assertionResults']> => {
    const results = await Promise.all(assertions.map(async assertion => {
      try {
        let fieldValue;
        let passed = false;
        let message = '';

        switch (assertion.type) {
          case 'status':
            fieldValue = response.status;
            passed = compareValues(fieldValue, assertion.value, assertion.operator);
            message = `Status Code ${fieldValue} ${passed ? 'matches' : 'does not match'} expected ${assertion.value}`;
            break;

          case 'body':
            if (assertion.validationType === 'schema') {
              try {
                const schema = JSON.parse(assertion.schema || '{}');
                const validate = ajv.compile(schema);
                const validationResult = await validate(response);
                passed = validationResult;
                message = passed 
                  ? `Schema validation passed for ${assertion.path}`
                  : `Schema validation failed for ${assertion.path}: ${ajv.errorsText(validate.errors)}`;
              } catch (error) {
                passed = false;
                message = `Invalid JSON Schema: ${error instanceof Error ? error.message : String(error)}`;
              }
            } else {
              fieldValue = getNestedValue(response, assertion.path);
              passed = compareValues(fieldValue, assertion.value, assertion.operator);
              message = `Value at path "${assertion.path}" ${passed ? 'matches' : 'does not match'} expected value`;
              if (!passed) {
                message += `\nExpected: ${assertion.value}\nActual: ${fieldValue === undefined ? 'undefined' : JSON.stringify(fieldValue)}`;
              }
            }
            break;

          case 'header':
            try {
              fieldValue = response.headers.get(assertion.path);
              passed = compareValues(fieldValue, assertion.value, assertion.operator);
              message = `Header "${assertion.path}" ${passed ? 'matches' : 'does not match'} expected value`;
              if (!passed) {
                message += `\nExpected: ${assertion.value}\nActual: ${fieldValue === null ? 'null' : fieldValue}`;
              }
            } catch (error) {
              passed = false;
              message = `Error validating header: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
            break;
        }

        return {
          field: assertion.path || assertion.type,
          expected: assertion.validationType === 'schema' ? 'Schema Validation' : assertion.value,
          actual: fieldValue,
          passed,
          message
        };
      } catch (error) {
        return {
          field: assertion.path || assertion.type,
          expected: assertion.validationType === 'schema' ? 'Schema Validation' : assertion.value,
          actual: 'Error',
          passed: false,
          message: `Error validating assertion: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }));

    return results;
  };

  const startTests = async () => {
    if (selectedTests.length === 0) {
      enqueueSnackbar('Please select at least one test to run', { variant: 'warning' });
      return;
    }

    // Clear previous test results, variables, and logs
    setTests(prevTests =>
      prevTests.map(test => ({
        ...test,
        status: 'pending',
        duration: 0,
        logs: '',
        assertionResults: undefined,
        isExpanded: false
      }))
    );

    // Clear variables before starting new execution
    setTestVariables([]);
    localStorage.removeItem(STORAGE_KEYS.TEST_VARIABLES);
    enqueueSnackbar('Variables cleared before test execution', { variant: 'info' });

    // Clear logs before starting new execution
    setLogs({});
    localStorage.removeItem(STORAGE_KEYS.TEST_LOGS);
    enqueueSnackbar('Logs cleared before test execution', { variant: 'info' });

    setIsRunning(true);
    setProgress(0);

    const testsToRun = tests.filter(test => selectedTests.includes(test.name));
    const totalTests = testsToRun.length;
    let completedTests = 0;

    for (const test of testsToRun) {
      try {
        setTests(prevTests =>
          prevTests.map(t =>
            t.name === test.name ? { ...t, status: 'running' } : t
          )
        );

        const startTime = Date.now();
        
        // Get the environment for this test
        const savedRequests = localStorage.getItem(STORAGE_KEYS.API_REQUESTS);
        if (!savedRequests) {
          throw new Error('No API requests found');
        }

        const requests: ApiRequest[] = JSON.parse(savedRequests);
        const request = requests.find(r => r.name === test.name);
        if (!request) {
          throw new Error(`Request not found: ${test.name}`);
        }

        const environment = environments.find(env => env.name === request.environment);
        if (!environment) {
          throw new Error(`Environment not found: ${request.environment}`);
        }

        // Construct the full URL using the environment's base URL
        const baseUrl = environment.baseUrl.endsWith('/') ? environment.baseUrl.slice(0, -1) : environment.baseUrl;
        const endpoint = request.endpoint.startsWith('/') ? request.endpoint : `/${request.endpoint}`;
        const fullUrl = `${baseUrl}${endpoint}`;

        // Replace environment parameters in the URL
        let finalUrl = fullUrl;
        Object.entries(environment.parameters).forEach(([key, value]) => {
          finalUrl = finalUrl.replace(`{${key}}`, value);
        });

        // Parse headers and ensure Content-Type is set for requests with body
        let headers = {};
        try {
          headers = JSON.parse(request.headers || '{}');
        } catch (error) {
          console.error('Error parsing headers:', error);
          headers = {};
        }

        if (request.method !== 'GET' && request.body) {
          headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }

        // Replace environment parameters in headers and body
        let body = {};
        try {
          body = JSON.parse(request.body || '{}');
        } catch (error) {
          console.error('Error parsing body:', error);
          body = {};
        }

        Object.entries(environment.parameters).forEach(([key, value]) => {
          const headersStr = JSON.stringify(headers);
          const bodyStr = JSON.stringify(body);
          
          try {
            headers = JSON.parse(headersStr.replace(`{${key}}`, value));
          } catch (error) {
            console.error('Error replacing parameters in headers:', error);
          }
          try {
            body = JSON.parse(bodyStr.replace(`{${key}}`, value));
          } catch (error) {
            console.error('Error replacing parameters in body:', error);
          }
        });

        console.log('Making request to:', finalUrl); // Debug log
        const response = await fetch(finalUrl, {
          method: request.method,
          headers: headers,
          body: request.method !== 'GET' ? JSON.stringify(body) : undefined,
        });

        let responseData = {};
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            responseData = await response.json();
          } catch (error) {
            // If JSON parsing fails, use empty object for DELETE requests
            if (request.method !== 'DELETE') {
              throw error;
            }
          }
        }

        const duration = Date.now() - startTime;

        // Extract and store variables from response
        const newVariables = extractVariablesFromResponse(test.name, responseData);
        
        // Update test variables
        setTestVariables(prev => {
          const existingTestIndex = prev.findIndex(tv => tv.testName === test.name);
          if (existingTestIndex >= 0) {
            const updated = [...prev];
            updated[existingTestIndex] = {
              testName: test.name,
              variables: newVariables
            };
            return updated;
          }
          return [...prev, { testName: test.name, variables: newVariables }];
        });

        // Validate assertions if they exist
        const assertionResults = test.assertions ? await validateAssertions(responseData, test.assertions) : undefined;
        const allAssertionsPassed = assertionResults ? assertionResults.every(a => a.passed) : true;

        const testStatus = response.status === test.expectedStatus && allAssertionsPassed ? 'passed' : 'failed';
        
        // Create formatted logs
        const formattedLogs = [
          `Test: ${test.name}`,
          `Status: ${testStatus.toUpperCase()}`,
          `Duration: ${duration}ms`,
          `Request Details:`,
          `  Method: ${request.method}`,
          `  Base URL: ${baseUrl}`,
          `  Endpoint: ${endpoint}`,
          `  Full URL: ${finalUrl}`,
          `  Headers: ${JSON.stringify(headers, null, 2)}`,
          `  Body: ${request.body || 'None'}`,
          `Response Details:`,
          `  Status: ${response.status}`,
          `  Expected Status: ${test.expectedStatus}`,
          `  Body: ${JSON.stringify(responseData, null, 2)}`,
        ];

        // Update test status and logs
        setTests(prevTests =>
          prevTests.map(t =>
            t.name === test.name
              ? {
                  ...t,
                  status: testStatus,
                  duration,
                  logs: formattedLogs.join('\n'),
                  assertionResults
                }
              : t
          )
        );

        // Save logs to state and localStorage
        setLogs(prevLogs => ({
          ...prevLogs,
          [test.name]: formattedLogs
        }));

        // Save test result with all required fields
        const testResult = {
          name: test.name,
          status: testStatus,
          duration,
          suite: test.suite || 'default',
          timestamp: new Date().toISOString(),
          method: test.method,
          endpoint: test.endpoint,
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          assertions: test.assertions,
          assertionResults,
          logs: formattedLogs.join('\n')
        };

        // Update results in localStorage
        const savedResults = localStorage.getItem('test_automation_results');
        const results = savedResults ? JSON.parse(savedResults) : [];
        
        const existingResultIndex = results.findIndex((r: TestResult) => r.name === test.name);
        
        if (existingResultIndex >= 0) {
          results[existingResultIndex] = testResult;
        } else {
          results.push(testResult);
        }
        
        // Save to localStorage and trigger storage event
        localStorage.setItem('test_automation_results', JSON.stringify(results));
        
        // Manually dispatch storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'test_automation_results',
          newValue: JSON.stringify(results),
          oldValue: savedResults,
          storageArea: localStorage
        }));

        // Capture cookies from response
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
          // Update test status with cookies
          setTests(prevTests => 
            prevTests.map(t => 
              t.name === test.name 
                ? { ...t, cookies } 
                : t
            )
          );

          // Save cookies to configuration if MFA is enabled
          if (authType === 'mfa') {
            localStorage.setItem('mfa_cookies', cookies);
            // Notify configuration panel about new cookies
            window.dispatchEvent(new CustomEvent('mfa_cookies_updated', { detail: cookies }));
          }
        }

      } catch (error) {
        console.error('Error running test:', error);
        const errorLogs = [
          `Test: ${test.name}`,
          `Status: FAILED`,
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          `Request Details:`,
          `  Method: ${test.method}`,
          `  Endpoint: ${test.endpoint}`,
          `  Headers: ${(() => {
            try {
              const requestHeaders = JSON.parse(test.headers || '{}');
              return JSON.stringify(requestHeaders, null, 2);
            } catch (e) {
              return test.headers || '{}';
            }
          })()}`,
          `  Body: ${test.body || 'None'}`
        ].join('\n');

        setTests(prevTests =>
          prevTests.map(t =>
            t.name === test.name
              ? {
                  ...t,
                  status: 'failed',
                  logs: errorLogs
                }
              : t
          )
        );

        // Save error logs to state and localStorage
        setLogs(prevLogs => ({
          ...prevLogs,
          [test.name]: errorLogs.split('\n')
        }));

        // Save failed test result with all required fields
        const testResult = {
          name: test.name,
          status: 'failed',
          duration: 0,
          suite: test.suite || 'default',
          timestamp: new Date().toISOString(),
          method: test.method,
          endpoint: test.endpoint,
          expectedStatus: test.expectedStatus,
          actualStatus: 0,
          assertions: test.assertions,
          assertionResults: [],
          logs: errorLogs
        };

        // Update results in localStorage
        const savedResults = localStorage.getItem('test_automation_results');
        const results = savedResults ? JSON.parse(savedResults) : [];
        
        const existingResultIndex = results.findIndex((r: TestResult) => r.name === test.name);
        
        if (existingResultIndex >= 0) {
          results[existingResultIndex] = testResult;
        } else {
          results.push(testResult);
        }
        
        // Save to localStorage and trigger storage event
        localStorage.setItem('test_automation_results', JSON.stringify(results));
        
        // Manually dispatch storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'test_automation_results',
          newValue: JSON.stringify(results),
          oldValue: savedResults,
          storageArea: localStorage
        }));
      }

      completedTests++;
      setProgress((completedTests / totalTests) * 100);
    }

    setIsRunning(false);
  };

  const stopTests = () => {
    setIsRunning(false);
    setProgress(0);
    setTests(tests.map(test => 
      test.status === 'running' ? { ...test, status: 'pending' } : test
    ));
    enqueueSnackbar('Test execution stopped', { variant: 'info' });
  };

  const resetTests = () => {
    setTests(tests.map(test => ({ 
      ...test, 
      status: 'pending', 
      duration: 0,
      logs: '',
      response: undefined
    })));
    setProgress(0);
    setSelectedTests([]);
    enqueueSnackbar('Test status reset', { variant: 'info' });
  };

  const handleSuiteChange = (event: any) => {
    setSelectedSuite(event.target.value);
    setSelectedTests([]);
  };

  const handleTestSelection = (testName: string) => {
    setSelectedTests(prev => 
      prev.includes(testName)
        ? prev.filter(name => name !== testName)
        : [...prev, testName]
    );
  };

  const handleSelectAllTests = () => {
    const filteredTests = tests
      .filter(test => selectedSuite === 'all' || test.suite === selectedSuite)
      .map(test => test.name);
    
    setSelectedTests(
      selectedTests.length === filteredTests.length ? [] : filteredTests
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return <PendingIcon sx={{ color: 'action.disabled' }} />;
    }
  };

  const getStatusChip = (status: string) => {
    const statusColors: { [key: string]: 'default' | 'primary' | 'success' | 'error' } = {
      pending: 'default',
      running: 'primary',
      passed: 'success',
      failed: 'error',
    };

    return (
      <Chip 
        label={status.toUpperCase()} 
        color={statusColors[status]} 
        size="small"
        sx={{ minWidth: 90 }}
      />
    );
  };

  const downloadLogs = (testName: string) => {
    const test = tests.find(t => t.name === testName);
    if (!test || !test.logs) return;

    const logContent = test.logs;
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${testName}_logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (testName: string) => {
    setTests(prevTests => 
      prevTests.map(test => 
        test.name === testName 
          ? { ...test, isExpanded: !test.isExpanded }
          : test
      )
    );

    // Save test status with expanded state
    const updatedTests = tests.map(test => 
      test.name === testName 
        ? { ...test, isExpanded: !test.isExpanded }
        : test
    );
    localStorage.setItem(STORAGE_KEYS.TEST_STATUS, JSON.stringify(updatedTests));
  };

  const toggleAllExpand = () => {
    setAllExpanded(!allExpanded);
    const updatedTests = tests.map(test => ({
      ...test,
      isExpanded: !allExpanded
    }));
    setTests(updatedTests as TestStatus[]);
    localStorage.setItem(STORAGE_KEYS.TEST_STATUS, JSON.stringify(updatedTests));
  };

  const clearAllLogs = () => {
    const updatedTests = tests.map(test => ({
      ...test,
      logs: '',
      status: 'pending' as const,
      duration: 0,
      assertionResults: undefined,
      isExpanded: false
    }));
    setTests(updatedTests as TestStatus[]);
    setLogs({});
    localStorage.setItem(STORAGE_KEYS.TEST_STATUS, JSON.stringify(updatedTests));
    localStorage.removeItem(STORAGE_KEYS.TEST_LOGS);
    enqueueSnackbar('All logs cleared', { variant: 'info' });
  };

  const filteredTests = tests.filter(
    test => selectedSuite === 'all' || test.suite === selectedSuite
  );

  const executeTest = async (test: TestStatus) => {
    try {
      const savedRequests = localStorage.getItem(STORAGE_KEYS.API_REQUESTS);
      if (!savedRequests) {
        throw new Error('No API requests found');
      }

      const requests: ApiRequest[] = JSON.parse(savedRequests);
      const request = requests.find(r => r.name === test.name);
      if (!request) {
        throw new Error(`Request not found: ${test.name}`);
      }

      // Get the environment for this request
      const environment = environments.find(env => env.name === request.environment);
      if (!environment) {
        throw new Error(`Environment not found: ${request.environment}`);
      }

      // Construct the full URL using the environment's base URL
      const baseUrl = environment.baseUrl.endsWith('/') ? environment.baseUrl.slice(0, -1) : environment.baseUrl;
      const endpoint = request.endpoint.startsWith('/') ? request.endpoint : `/${request.endpoint}`;
      const fullUrl = `${baseUrl}${endpoint}`;

      // Replace environment parameters in the URL
      let finalUrl = fullUrl;
      Object.entries(environment.parameters).forEach(([key, value]) => {
        finalUrl = finalUrl.replace(`{${key}}`, value);
      });

      // Replace environment parameters in headers and body
      let headers = JSON.parse(request.headers || '{}');
      let body = JSON.parse(request.body || '{}');

      Object.entries(environment.parameters).forEach(([key, value]) => {
        const headersStr = JSON.stringify(headers);
        const bodyStr = JSON.stringify(body);
        
        headers = JSON.parse(headersStr.replace(`{${key}}`, value));
        body = JSON.parse(bodyStr.replace(`{${key}}`, value));
      });

      // Make the API request
      const startTime = Date.now();
      console.log('Making request to:', finalUrl);
      
      const response = await fetch(finalUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' ? JSON.stringify(body) : undefined
      });

      const responseTime = Date.now() - startTime;
      const responseData = await response.json();

      // Log the request and response details
      const logEntry = [
        `Test: ${test.name}`,
        `Status: ${response.status === request.expectedStatus ? 'PASSED' : 'FAILED'}`,
        '',
        'Request Details:',
        `Method: ${request.method}`,
        `Endpoint: ${finalUrl}`,
        `Headers: ${JSON.stringify(headers, null, 2)}`,
        `Body: ${request.method !== 'GET' ? JSON.stringify(body, null, 2) : 'None'}`,
        '',
        'Response Details:',
        `Status Code: ${response.status}`,
        `Response Time: ${responseTime}ms`,
        `Response Body: ${JSON.stringify(responseData, null, 2)}`,
        '',
        'Assertion Results:'
      ];

      // Validate assertions
      let allAssertionsPassed = true;
      for (const assertion of request.assertions) {
        let assertionResult = '';
        let assertionPassed = false;

        try {
          switch (assertion.type) {
            case 'status':
              assertionPassed = response.status === parseInt(assertion.value);
              assertionResult = `Status Code ${response.status} ${assertionPassed ? 'matches' : 'does not match'} expected ${assertion.value}`;
              break;

            case 'body':
              if (assertion.validationType === 'schema') {
                try {
                  // Schema validation
                  const schema = JSON.parse(assertion.schema || '{}');
                  const validate = ajv.compile(schema);
                  assertionPassed = validate(responseData);
                  assertionResult = `Schema validation ${assertionPassed ? 'passed' : 'failed'}: ${JSON.stringify(validate.errors)}`;
                } catch (error) {
                  assertionPassed = false;
                  assertionResult = `Schema validation failed: ${error instanceof Error ? error.message : 'Invalid schema'}`;
                }
              } else {
                // Value validation
                const value = getValueByPath(responseData, assertion.path);
                assertionPassed = compareValues(value, assertion.value, assertion.operator);
                assertionResult = `Value at path "${assertion.path}" ${assertionPassed ? 'matches' : 'does not match'} expected value`;
                if (!assertionPassed) {
                  assertionResult += `\nExpected: ${assertion.value}\nActual: ${value === undefined ? 'undefined' : JSON.stringify(value)}`;
                }
              }
              break;

            case 'header':
              try {
                const headerValue = response.headers.get(assertion.path);
                assertionPassed = compareValues(headerValue, assertion.value, assertion.operator);
                assertionResult = `Header "${assertion.path}" ${assertionPassed ? 'matches' : 'does not match'} expected value`;
                if (!assertionPassed) {
                  assertionResult += `\nExpected: ${assertion.value}\nActual: ${headerValue === null ? 'null' : headerValue}`;
                }
              } catch (error) {
                assertionPassed = false;
                assertionResult = `Error validating header: ${error instanceof Error ? error.message : 'Unknown error'}`;
              }
              break;
          }

          if (!assertionPassed) {
            allAssertionsPassed = false;
          }

          logEntry.push(
            `Assertion: ${assertion.type.toUpperCase()} - ${assertion.path || 'N/A'}`,
            `Operator: ${assertion.operator}`,
            `Expected: ${assertion.value}`,
            `Result: ${assertionPassed ? 'PASSED' : 'FAILED'}`,
            `Details: ${assertionResult}`,
            ''
          );
        } catch (error) {
          allAssertionsPassed = false;
          logEntry.push(
            `Assertion: ${assertion.type.toUpperCase()} - ${assertion.path || 'N/A'}`,
            `Result: FAILED`,
            `Error: ${error.message}`,
            ''
          );
        }
      }

      // Update test status
      setTests(prevTests =>
        prevTests.map(t =>
          t.name === test.name
            ? {
                ...t,
                status: allAssertionsPassed ? 'passed' : 'failed',
                duration: responseTime
              }
            : t
        )
      );

      // Add logs
      setLogs(prevLogs => ({
        ...prevLogs,
        [test.name]: logEntry
      }));

    } catch (error) {
      console.error('Error executing test:', error);
      setTests(prevTests =>
        prevTests.map(t =>
          t.name === test.name
            ? {
                ...t,
                status: 'failed',
                error: error.message
              }
            : t
        )
      );

      setLogs(prevLogs => ({
        ...prevLogs,
        [test.name]: [
          `Test: ${test.name}`,
          `Status: FAILED`,
          '',
          'Error Details:',
          error.message,
          '',
          'Request Details:',
          `Method: ${request?.method || 'N/A'}`,
          `Endpoint: ${request?.endpoint || 'N/A'}`,
          `Environment: ${request?.environment || 'N/A'}`
        ]
      }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Test Execution
        </Typography>

        <Grid container spacing={3}>
          {/* Variables Section */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    Variables
                  </Typography>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={clearVariables}
                    disabled={testVariables.length === 0}
                    sx={{
                      borderRadius: 1,
                      px: 1.5,
                      py: 0.5,
                      minWidth: 'auto',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: 1,
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    Clear All
                  </Button>
                </Box>
                <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
                  {testVariables.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No variables available. Run tests to see variables.
                      </Typography>
                    </Box>
                  ) : (
                    testVariables.map((testVar) => (
                      <Accordion key={testVar.testName} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                              {testVar.testName}
                            </Typography>
                            <Chip
                              label={`${testVar.variables.length} variables`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell width="40%">Name</TableCell>
                                  <TableCell width="60%">Value</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {testVar.variables.map((variable, index) => (
                                  <TableRow key={index} hover>
                                    <TableCell>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          fontFamily: 'monospace',
                                          wordBreak: 'break-all'
                                        }}
                                      >
                                        {variable.name}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Box sx={{ 
                                        maxHeight: '200px', 
                                        overflow: 'auto',
                                        bgcolor: 'grey.50',
                                        p: 1,
                                        borderRadius: 1
                                      }}>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all'
                                          }}
                                        >
                                          {typeof variable.value === 'object' 
                                            ? JSON.stringify(variable.value, null, 2)
                                            : String(variable.value)}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Test Execution Section */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    Test Execution
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Test Suite</InputLabel>
                      <Select
                        value={selectedSuite}
                        label="Test Suite"
                        onChange={handleSuiteChange}
                      >
                        <MenuItem value="all">All Suites</MenuItem>
                        {Object.values(TEST_SUITES).map((suite) => (
                          <MenuItem key={suite} value={suite}>
                            {suite.charAt(0).toUpperCase() + suite.slice(1)} Tests
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={loadTests}
                      sx={{
                        borderRadius: 1,
                        px: 1.5,
                        py: 0.5,
                        minWidth: 'auto',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 1,
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      Refresh
                    </Button>
                    <LoadingButton
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={startTests}
                      loading={isRunning}
                      disabled={isRunning || selectedTests.length === 0}
                      startIcon={<PlayArrowIcon />}
                      sx={{
                        borderRadius: 1,
                        px: 2,
                        py: 0.5,
                        minWidth: 'auto',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 2,
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      Run
                    </LoadingButton>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      startIcon={<StopIcon />}
                      onClick={stopTests}
                      disabled={!isRunning}
                      sx={{
                        borderRadius: 1,
                        px: 2,
                        py: 0.5,
                        minWidth: 'auto',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 2,
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      Stop
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={clearAllLogs}
                      sx={{
                        borderRadius: 1,
                        px: 1.5,
                        py: 0.5,
                        minWidth: 'auto',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 1,
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      Clear Logs
                    </Button>
                  </Box>
                </Box>

                {isRunning && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Overall Progress
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={progress} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        bgcolor: 'grey.200',
                      }} 
                    />
                    <Typography variant="body2" color="text.secondary" align="right" sx={{ mt: 1 }}>
                      {progress}%
                    </Typography>
                  </Box>
                )}

                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Checkbox
                        checked={
                          filteredTests.length > 0 &&
                          filteredTests.every(test => selectedTests.includes(test.name))
                        }
                        indeterminate={
                          selectedTests.length > 0 &&
                          selectedTests.length < filteredTests.length
                        }
                        onChange={handleSelectAllTests}
                      />
                    </ListItemIcon>
                    <ListItemText primary="Select All" />
                  </ListItem>
                  {filteredTests.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No tests available. Add tests in the Configuration tab.
                      </Typography>
                    </Box>
                  ) : (
                    filteredTests.map((test, index) => (
                      <motion.div
                        key={index}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ListItem 
                          sx={{ 
                            borderRadius: 2,
                            mb: 1,
                            bgcolor: 'background.paper',
                            boxShadow: 1,
                          }}
                        >
                          <ListItemIcon>
                            <Checkbox
                              checked={selectedTests.includes(test.name)}
                              onChange={() => handleTestSelection(test.name)}
                              disabled={isRunning}
                            />
                          </ListItemIcon>
                          <Box sx={{ mr: 2 }}>
                            {getStatusIcon(test.status)}
                          </Box>
                          <ListItemText 
                            primary={test.name}
                            secondary={
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip 
                                  label={test.suite} 
                                  size="small" 
                                  color={test.suite === TEST_SUITES.SMOKE ? 'success' : 
                                         test.suite === TEST_SUITES.REGRESSION ? 'primary' :
                                         test.suite === TEST_SUITES.SANITY ? 'warning' : 'secondary'}
                                />
                                {test.duration > 0 && `Duration: ${test.duration}ms`}
                              </Box>
                            }
                          />
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Tooltip title="Download Logs">
                              <IconButton
                                size="small"
                                onClick={() => downloadLogs(test.name)}
                                disabled={!test.logs}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={test.isExpanded ? "Collapse" : "Expand"}>
                              <IconButton
                                size="small"
                                onClick={() => toggleExpand(test.name)}
                              >
                                {test.isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </Tooltip>
                            {getStatusChip(test.status)}
                          </Box>
                        </ListItem>
                        {test.isExpanded && test.logs && (
                          <Box sx={{ pl: 4, mb: 2 }}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Test Logs:
                              </Typography>
                              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                                {test.logs.split('\n').map((log, logIndex) => {
                                  // Style different parts of the log
                                  if (log.startsWith('Test:')) {
                                    return (
                                      <Typography key={logIndex} variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>
                                        {log}
                                      </Typography>
                                    );
                                  } else if (log.startsWith('Status:')) {
                                    const isPassed = log.includes('PASSED');
                                    return (
                                      <Typography key={logIndex} variant="body2" color={isPassed ? 'success.main' : 'error.main'}>
                                        {log}
                                      </Typography>
                                    );
                                  } else if (log.startsWith('Duration:')) {
                                    return (
                                      <Typography key={logIndex} variant="body2" color="text.secondary">
                                        {log}
                                      </Typography>
                                    );
                                  } else if (log.startsWith('Request Details:') || log.startsWith('Response Details:') || log.startsWith('Assertion Results:')) {
                                    return (
                                      <Typography key={logIndex} variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2 }}>
                                        {log}
                                      </Typography>
                                    );
                                  } else if (log.startsWith('Assertion')) {
                                    return (
                                      <Typography key={logIndex} variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>
                                        {log}
                                      </Typography>
                                    );
                                  } else if (log.startsWith('Field:') || log.startsWith('Expected:') || log.startsWith('Actual:')) {
                                    return (
                                      <Typography key={logIndex} variant="body2" sx={{ pl: 2 }}>
                                        {log}
                                      </Typography>
                                    );
                                  } else if (log.startsWith('Status:')) {
                                    const isPassed = log.includes('PASSED');
                                    return (
                                      <Typography key={logIndex} variant="body2" color={isPassed ? 'success.main' : 'error.main'} sx={{ pl: 2 }}>
                                        {log}
                                      </Typography>
                                    );
                                  } else if (log.startsWith('Message:')) {
                                    const isPassed = log.includes('PASSED');
                                    return (
                                      <Typography key={logIndex} variant="body2" color={isPassed ? 'success.main' : 'error.main'} sx={{ pl: 2, mb: 1 }}>
                                        {log}
                                      </Typography>
                                    );
                                  } else {
                                    return (
                                      <Typography key={logIndex} variant="body2" sx={{ fontFamily: 'monospace' }}>
                                        {log}
                                      </Typography>
                                    );
                                  }
                                })}
                              </Box>
                            </Paper>
                          </Box>
                        )}
                      </motion.div>
                    ))
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
}

export default ExecutionPanel;