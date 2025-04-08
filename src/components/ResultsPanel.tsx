import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemIcon,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  DialogContentText,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CheckCircle,
  Error,
  Pending,
  Search,
  FilterList,
  Sort,
  Refresh,
  Download,
  Delete,
  Close,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

interface AssertionResult {
  passed: boolean;
  message?: string;
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  suite: string;
  timestamp: string;
  method: string;
  endpoint: string;
  expectedStatus: number;
  actualStatus: number;
  assertions: string[];
  assertionResults?: AssertionResult[];
  logs?: string;
}

interface TestSuite {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

const COLORS = ['#4CAF50', '#F44336', '#FFC107'];

interface DetailsDialog {
  open: boolean;
  title: string;
  content: React.ReactNode | null;
}

function ResultsPanel() {
  const theme = useTheme();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    console.log('selectedTest state changed:', selectedTest);
  }, [selectedTest]);

  useEffect(() => {
    const loadResults = () => {
      try {
        console.log('Loading results from localStorage');
        const savedResults = localStorage.getItem('test_automation_results');
        console.log('Saved results:', savedResults);
        
        if (savedResults) {
          const parsedResults = JSON.parse(savedResults);
          console.log('Parsed results:', parsedResults);
          
          // Ensure we have the correct data structure
          const formattedResults = parsedResults.map((result: any) => ({
            name: result.name,
            status: result.status,
            duration: result.duration || 0,
            suite: result.suite || 'default',
            timestamp: result.timestamp || new Date().toISOString(),
            method: result.method,
            endpoint: result.endpoint,
            expectedStatus: result.expectedStatus,
            actualStatus: result.actualStatus,
            assertions: result.assertions || [],
            assertionResults: result.assertionResults || [],
            logs: result.logs || ''
          }));
          
          console.log('Formatted results:', formattedResults);
          setResults(formattedResults);
        } else {
          console.log('No results found in localStorage');
          setResults([]);
        }
      } catch (error) {
        console.error('Error loading results:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Load results immediately
    loadResults();

    // Add a visibility change listener to reload data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadResults();
      }
    };

    // Add a storage event listener to update results when they change
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'test_automation_results' && e.newValue) {
        try {
          console.log('Storage event triggered, new results:', e.newValue);
          const newResults = JSON.parse(e.newValue);
          const formattedResults = newResults.map((result: any) => ({
            name: result.name,
            status: result.status,
            duration: result.duration || 0,
            suite: result.suite || 'default',
            timestamp: result.timestamp || new Date().toISOString(),
            method: result.method,
            endpoint: result.endpoint,
            expectedStatus: result.expectedStatus,
            actualStatus: result.actualStatus,
            assertions: result.assertions || [],
            assertionResults: result.assertionResults || [],
            logs: result.logs || ''
          }));
          console.log('Updated results:', formattedResults);
          setResults(formattedResults);
        } catch (error) {
          console.error('Error updating results:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getTestSuites = () => {
    console.log('Getting test suites from results:', results);
    const suites = new Map<string, {
      name: string;
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
    }>();

    // First pass: count unique tests per suite
    const uniqueTests = new Map<string, Set<string>>();
    results.forEach(result => {
      if (!uniqueTests.has(result.suite)) {
        uniqueTests.set(result.suite, new Set());
      }
      uniqueTests.get(result.suite)?.add(result.name);
    });

    console.log('Unique tests per suite:', uniqueTests);

    // Second pass: calculate statistics
    results.forEach(result => {
      const suite = suites.get(result.suite) || {
        name: result.suite,
        total: uniqueTests.get(result.suite)?.size || 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      };

      // Only count the latest status for each test
      const isLatestTest = !results.some(r => 
        r.name === result.name && 
        r.suite === result.suite && 
        new Date(r.timestamp) > new Date(result.timestamp)
      );

      if (isLatestTest) {
        switch (result.status) {
          case 'passed':
            suite.passed++;
            break;
          case 'failed':
            suite.failed++;
            break;
          case 'skipped':
            suite.skipped++;
            break;
        }
      }

      suite.duration += result.duration;
      suites.set(result.suite, suite);
    });

    const suiteArray = Array.from(suites.values()).sort((a, b) => b.total - a.total);
    console.log('Final suite statistics:', suiteArray);
    return suiteArray;
  };

  const getFilteredResults = () => {
    console.log('Filtering results with timeRange:', selectedTimeRange);
    let filtered = [...results];
    
    // Filter by time range
    const now = new Date();
    const cutoff = new Date();
    
    switch (selectedTimeRange) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
    }
    
    filtered = filtered.filter(result => {
      const resultDate = new Date(result.timestamp);
      return resultDate >= cutoff;
    });
    
    // Filter by suite if not 'all'
    if (selectedSuite !== 'all') {
      filtered = filtered.filter(result => result.suite === selectedSuite);
    }
    
    // Apply search query if present
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(result => 
        result.name.toLowerCase().includes(query) ||
        result.suite.toLowerCase().includes(query) ||
        result.status.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'date':
          return order * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        case 'duration':
          return order * (a.duration - b.duration);
        case 'status':
          return order * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    console.log('Filtered results:', filtered);
    return filtered;
  };

  const getSuiteStatistics = () => {
    const suites = getTestSuites();
    const stats = {
      totalSuites: suites.length,
      totalTests: suites.reduce((sum, suite) => sum + suite.total, 0),
      totalPassed: suites.reduce((sum, suite) => sum + suite.passed, 0),
      totalFailed: suites.reduce((sum, suite) => sum + suite.failed, 0),
      totalSkipped: suites.reduce((sum, suite) => sum + suite.skipped, 0),
      averageDuration: suites.reduce((sum, suite) => sum + suite.duration, 0) / (suites.length || 1)
    };
    console.log('Suite statistics:', stats);
    return stats;
  };

  const getSuiteChartData = () => {
    const suites = getTestSuites();
    return suites.map(suite => ({
      name: suite.name,
      passed: suite.passed,
      failed: suite.failed,
      skipped: suite.skipped,
      total: suite.total
    }));
  };

  const getTrendData = () => {
    const filteredResults = getFilteredResults();
    const trendData: { [key: string]: { passed: number; failed: number; skipped: number } } = {};

    filteredResults.forEach(result => {
      const date = new Date(result.timestamp).toLocaleDateString();
      if (!trendData[date]) {
        trendData[date] = { passed: 0, failed: 0, skipped: 0 };
      }

      trendData[date][result.status]++;
    });

    return Object.entries(trendData).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  };

  const getStatusDistribution = () => {
    const distribution = {
      passed: 0,
      failed: 0,
      skipped: 0
    };

    results.forEach(result => {
      distribution[result.status]++;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  const getDurationTrend = () => {
    const filteredResults = getFilteredResults();
    const durationData: { [key: string]: number[] } = {};

    filteredResults.forEach(result => {
      const date = new Date(result.timestamp).toLocaleDateString();
      if (!durationData[date]) {
        durationData[date] = [];
      }
      durationData[date].push(result.duration);
    });

    return Object.entries(durationData).map(([date, durations]) => ({
      date,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    }));
  };

  const handleExportResults = () => {
    const data = getFilteredResults();
    const csvContent = [
      ['Test Name', 'Suite', 'Status', 'Duration (ms)', 'Timestamp'],
      ...data.map(result => [
        result.name,
        result.suite,
        result.status,
        result.duration,
        new Date(result.timestamp).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `test-results-${new Date().toISOString()}.csv`;
    link.click();
  };

  const handleClearResults = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    localStorage.removeItem('test_automation_results');
    setResults([]);
    setShowClearConfirm(false);
    enqueueSnackbar('All test results have been cleared', { variant: 'success' });
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  const renderSummaryCards = () => {
    const stats = getSuiteStatistics();
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Total Tests
              </Typography>
              <Typography variant="h4">
                {stats.totalTests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across {stats.totalSuites} suites
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" color="success.main" gutterBottom>
                Passed
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.totalPassed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {((stats.totalPassed / stats.totalTests) * 100).toFixed(1)}% success rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" color="error.main" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.totalFailed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {((stats.totalFailed / stats.totalTests) * 100).toFixed(1)}% failure rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" color="warning.main" gutterBottom>
                Average Duration
              </Typography>
              <Typography variant="h4" color="warning.main">
                {Math.round(stats.averageDuration)}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                per test
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderTestList = () => {
    const filteredResults = getFilteredResults();
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Test Execution History</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'duration' | 'status')}
                >
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="duration">Duration</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                </Select>
              </FormControl>
              <IconButton 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
              >
                <Sort />
              </IconButton>
              <IconButton onClick={handleExportResults} title="Export Results">
                <Download />
              </IconButton>
            </Box>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Test Name</TableCell>
                  <TableCell>Suite</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResults.length > 0 ? (
                  filteredResults.map((result) => (
                    <TableRow key={`${result.name}-${result.timestamp}`}>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>
                        <Chip label={result.suite} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.status}
                          color={
                            result.status === 'passed'
                              ? 'success'
                              : result.status === 'failed'
                              ? 'error'
                              : 'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{result.duration}ms</TableCell>
                      <TableCell>
                        {new Date(result.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            console.log('Opening details for test:', result);
                            const testDetails: TestResult = {
                              name: result.name,
                              suite: result.suite,
                              status: result.status,
                              duration: result.duration,
                              timestamp: result.timestamp,
                              method: result.method || '',
                              endpoint: result.endpoint || '',
                              expectedStatus: result.expectedStatus || 0,
                              actualStatus: result.actualStatus || 0,
                              assertions: result.assertions || [],
                              assertionResults: result.assertionResults || [],
                              logs: result.logs || ''
                            };
                            console.log('Setting selected test:', testDetails);
                            setSelectedTest(testDetails);
                            setActiveTab(0);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">
                        No test results found matching your criteria
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  const renderTestDetails = (test: TestResult) => {
    console.log('renderTestDetails called with test:', test);
    console.log('Current selectedTest state:', selectedTest);
    
    if (!test) {
      console.log('No test provided to renderTestDetails');
      return null;
    }
    
    console.log('Rendering test details for:', test);
    console.log('Test logs:', test.logs);
    
    const testExecutions = results
      .filter(r => r.name === test.name && r.suite === test.suite)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log('Found test executions:', testExecutions);

    return (
      <Dialog
        open={!!selectedTest}
        onClose={() => {
          console.log('Dialog onClose triggered');
          setSelectedTest(null);
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '60vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Test Details</Typography>
            <IconButton 
              onClick={() => {
                console.log('Closing dialog from button');
                setSelectedTest(null);
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Latest Execution" />
            <Tab label="Execution History" />
          </Tabs>

          {activeTab === 0 && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Test Name</Typography>
                    <Typography variant="body1">{test.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Suite</Typography>
                    <Typography variant="body1">{test.suite}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip
                      label={test.status.toUpperCase()}
                      color={test.status === 'passed' ? 'success' : 'error'}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Duration</Typography>
                    <Typography variant="body1">{test.duration}ms</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Expected Status</Typography>
                    <Typography variant="body1">{test.expectedStatus}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Actual Status</Typography>
                    <Typography variant="body1">{test.actualStatus}</Typography>
                  </Grid>
                </Grid>
              </Box>

              {test.assertions && test.assertions.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Assertions
                  </Typography>
                  <List>
                    {test.assertions.map((assertion, index) => {
                      const result = test.assertionResults?.[index] as AssertionResult | undefined;
                      // Convert assertion to string if it's an object
                      const assertionText = typeof assertion === 'object' 
                        ? JSON.stringify(assertion, null, 2)
                        : assertion;
                      return (
                        <ListItem key={index} sx={{ py: 1 }}>
                          <ListItemIcon>
                            {result?.passed ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Error color="error" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={assertionText}
                            secondary={result?.message}
                            secondaryTypographyProps={{
                              color: result?.passed ? 'text.secondary' : 'error.main'
                            }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}

              {test.logs && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Execution Logs
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      maxHeight: 400, 
                      overflow: 'auto',
                      bgcolor: 'background.default'
                    }}
                  >
                    <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {test.logs.split('\n').map((line, index) => {
                        const isError = line.includes('FAILED') || line.includes('Error:');
                        const isSuccess = line.includes('PASSED');
                        return (
                          <Typography
                            key={index}
                            variant="body2"
                            sx={{
                              color: isError ? 'error.main' : isSuccess ? 'success.main' : 'text.primary',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {line}
                          </Typography>
                        );
                      })}
                    </Box>
                  </Paper>
                </Box>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Expected Status</TableCell>
                      <TableCell>Actual Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testExecutions.map((execution, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(execution.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={execution.status.toUpperCase()}
                            color={execution.status === 'passed' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{execution.duration}ms</TableCell>
                        <TableCell>{execution.expectedStatus}</TableCell>
                        <TableCell>{execution.actualStatus}</TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              const executionDetails: TestResult = {
                                name: execution.name,
                                suite: execution.suite,
                                status: execution.status,
                                duration: execution.duration,
                                timestamp: execution.timestamp,
                                method: execution.method || '',
                                endpoint: execution.endpoint || '',
                                expectedStatus: execution.expectedStatus || 0,
                                actualStatus: execution.actualStatus || 0,
                                assertions: execution.assertions || [],
                                assertionResults: execution.assertionResults || [],
                                logs: execution.logs || ''
                              };
                              setSelectedTest(executionDetails);
                              setActiveTab(0);
                            }}
                          >
                            View Logs
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Test Results Dashboard
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={handleClearResults}
        >
          Clear Results
        </Button>
      </Box>

      {/* Clear Results Confirmation Dialog */}
      <Dialog
        open={showClearConfirm}
        onClose={handleCancelClear}
        aria-labelledby="clear-results-dialog-title"
      >
        <DialogTitle id="clear-results-dialog-title">
          Clear Test Results
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all test results? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClear} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmClear} color="error" autoFocus>
            Clear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Filters and Tabs */}
      <Box sx={{ mt: 3, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select
                value={selectedTimeRange}
                label="Time Range"
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              >
                <MenuItem value="day">Last 24 Hours</MenuItem>
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Test Suite</InputLabel>
              <Select
                value={selectedSuite}
                label="Test Suite"
                onChange={(e) => setSelectedSuite(e.target.value)}
              >
                <MenuItem value="all">All Suites</MenuItem>
                {Array.from(new Set(results.map(r => r.suite))).map(suite => (
                  <MenuItem key={suite} value={suite}>{suite}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Main Content */}
      <Box sx={{ mt: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Test List" />
          <Tab label="Test Suites" />
          <Tab label="Trends" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && renderTestList()}
          {activeTab === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Suite Performance
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getSuiteChartData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="passed" stackId="a" fill="#4CAF50" name="Passed" />
                      <Bar dataKey="failed" stackId="a" fill="#F44336" name="Failed" />
                      <Bar dataKey="skipped" stackId="a" fill="#FFC107" name="Skipped" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          )}
          {activeTab === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Execution Trends
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="passed" stroke="#4CAF50" name="Passed" />
                      <Line type="monotone" dataKey="failed" stroke="#F44336" name="Failed" />
                      <Line type="monotone" dataKey="skipped" stroke="#FFC107" name="Skipped" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Test Details Dialog */}
      {selectedTest && renderTestDetails(selectedTest)}
    </Box>
  );
}

export default ResultsPanel;