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
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  CheckCircle,
  Error,
  Pending,
} from '@mui/icons-material';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  suite: string;
  timestamp: string;
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<TestResult[]>([]);
  const [detailsDialog, setDetailsDialog] = useState<DetailsDialog>({
    open: false,
    title: '',
    content: null,
  });

  useEffect(() => {
    const loadResults = () => {
      try {
        const savedResults = localStorage.getItem('test_automation_results');
        if (savedResults) {
          setResults(JSON.parse(savedResults));
        }
      } catch (error) {
        console.error('Error loading results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'test_automation_results' && e.newValue) {
        try {
          setResults(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error updating results:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getFilteredResults = () => {
    const now = new Date();
    const filteredResults = results.filter(result => {
      const resultDate = new Date(result.timestamp);
      const diffTime = Math.abs(now.getTime() - resultDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (selectedTimeRange) {
        case 'day':
          return diffDays <= 1;
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        default:
          return true;
      }
    });

    return filteredResults;
  };

  const getTestSuites = () => {
    const suites = new Map<string, {
      name: string;
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
    }>();

    results.forEach(result => {
      const suite = suites.get(result.suite) || {
        name: result.suite,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      };

      suite.total++;
      suite.duration += result.duration;

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

      suites.set(result.suite, suite);
    });

    return Array.from(suites.values());
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

  const handleChartClick = (data: any) => {
    if (data && data.activePayload) {
      const date = data.activePayload[0].payload.date;
      setSelectedDate(date);
      const filteredResults = results.filter(
        result => new Date(result.timestamp).toLocaleDateString() === date
      );
      setSelectedDetails(filteredResults);
      setDetailsDialogOpen(true);
    }
  };

  const handleSuiteClick = (suiteName: string) => {
    setSelectedSuite(suiteName);
    const filteredResults = results.filter(result => result.suite === suiteName);
    setSelectedDetails(filteredResults);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedDate(null);
    setSelectedSuite(null);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, bgcolor: 'background.paper', boxShadow: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  const handleTestCountClick = (suite: string, status?: 'passed' | 'failed' | 'skipped') => {
    const suiteTests = getTestSuites().find(s => s.name === suite);
    if (suiteTests) {
      setSelectedSuite(suite);
      const filteredResults = results
        .filter(result => result.suite === suite)
        .filter(result => !status || result.status === status);

      setDetailsDialog({
        open: true,
        title: status 
          ? `${suite} - ${status.charAt(0).toUpperCase() + status.slice(1)} Tests`
          : `${suite} Test Details`,
        content: (
          <Box>
            <Typography variant="h6" gutterBottom>
              Test Statistics
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Total Tests</TableCell>
                    <TableCell align="right">{filteredResults.length}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Passed</TableCell>
                    <TableCell align="right">
                      {filteredResults.filter(r => r.status === 'passed').length}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Failed</TableCell>
                    <TableCell align="right">
                      {filteredResults.filter(r => r.status === 'failed').length}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Skipped</TableCell>
                    <TableCell align="right">
                      {filteredResults.filter(r => r.status === 'skipped').length}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Average Duration</TableCell>
                    <TableCell align="right">
                      {Math.round(filteredResults.reduce((sum, r) => sum + r.duration, 0) / filteredResults.length)}ms
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Test Results
            </Typography>
            <List>
              {filteredResults
                .slice(0, 5)
                .map((result, index) => (
                  <ListItem key={index} divider={index < filteredResults.length - 1}>
                    <ListItemIcon>
                      {result.status === 'passed' ? (
                        <CheckCircle color="success" />
                      ) : result.status === 'failed' ? (
                        <Error color="error" />
                      ) : (
                        <Pending color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={result.name}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Duration: {result.duration}ms
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(result.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
            </List>
          </Box>
        )
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  const testSuites = getTestSuites();
  const trendData = getTrendData();
  const statusDistribution = getStatusDistribution();
  const durationTrend = getDurationTrend();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
        Test Results
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Suite Summary
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Test Suite</TableCell>
                      <TableCell align="right">Total Tests</TableCell>
                      <TableCell align="right">Passed</TableCell>
                      <TableCell align="right">Failed</TableCell>
                      <TableCell align="right">Skipped</TableCell>
                      <TableCell align="right">Average Duration (ms)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testSuites.map((suite) => (
                      <TableRow 
                        key={suite.name}
                        hover
                        onClick={() => handleTestCountClick(suite.name)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell component="th" scope="row">
                          <Chip
                            label={suite.name}
                            color={
                              suite.failed > 0
                                ? 'error'
                                : suite.skipped > 0
                                ? 'warning'
                                : 'success'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">{suite.total}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={suite.passed}
                            color="success"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestCountClick(suite.name, 'passed');
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={suite.failed}
                            color="error"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestCountClick(suite.name, 'failed');
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={suite.skipped}
                            color="warning"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestCountClick(suite.name, 'skipped');
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {Math.round(suite.duration / suite.total)}ms
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Status Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      onClick={handleChartClick}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Results Trend
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="passed" stroke="#4CAF50" name="Passed" />
                    <Line type="monotone" dataKey="failed" stroke="#F44336" name="Failed" />
                    <Line type="monotone" dataKey="skipped" stroke="#FFC107" name="Skipped" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Duration Trend
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={durationTrend} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="averageDuration" fill="#2196F3" name="Average Duration" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDate ? `Test Results for ${selectedDate}` : `Test Results for ${selectedSuite}`}
        </DialogTitle>
        <DialogContent>
          {detailsDialog.content}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ResultsPanel;