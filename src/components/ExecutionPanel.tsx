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
} from '@mui/material';
import { motion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import { ApiRequest, TEST_SUITES } from './ConfigurationPanel';

interface TestStatus {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  suite: string;
}

function ExecutionPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [tests, setTests] = useState<TestStatus[]>([]);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = () => {
    try {
      const savedRequests = localStorage.getItem('test_automation_api_requests');
      if (savedRequests) {
        const requests: ApiRequest[] = JSON.parse(savedRequests);
        setTests(requests.map(request => ({
          name: request.name,
          status: 'pending',
          suite: request.suite,
        })));
      }
    } catch (error) {
      enqueueSnackbar('Error loading tests', { variant: 'error' });
    }
  };

  const startTests = () => {
    if (selectedTests.length === 0) {
      enqueueSnackbar('Please select at least one test to run', { variant: 'warning' });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    
    // Update status to running for selected tests
    setTests(tests.map(test => ({
      ...test,
      status: selectedTests.includes(test.name) ? 'running' : test.status,
    })));
    
    // Simulate test execution with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    // Simulate test completion
    setTimeout(() => {
      setTests(tests.map(test => {
        if (!selectedTests.includes(test.name)) return test;
        return {
          ...test,
          status: Math.random() > 0.2 ? 'passed' : 'failed',
          duration: +(Math.random() * 2 + 0.5).toFixed(1),
        };
      }));
      setIsRunning(false);
      clearInterval(interval);
      enqueueSnackbar('Test execution completed', { variant: 'success' });
    }, 5000);
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
    setTests(tests.map(test => ({ ...test, status: 'pending', duration: undefined })));
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
    const statusColors = {
      pending: 'default',
      running: 'primary',
      passed: 'success',
      failed: 'error',
    };

    return (
      <Chip 
        label={status.toUpperCase()} 
        color={statusColors[status as keyof typeof statusColors]} 
        size="small"
        sx={{ minWidth: 90 }}
      />
    );
  };

  const filteredTests = tests.filter(
    test => selectedSuite === 'all' || test.suite === selectedSuite
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Test Execution
        </Typography>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
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
              </Grid>
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayArrowIcon />}
                    onClick={startTests}
                    disabled={isRunning}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    Run Selected Tests
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<StopIcon />}
                    onClick={stopTests}
                    disabled={!isRunning}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                    }}
                  >
                    Stop Tests
                  </Button>
                  <Tooltip title="Reset Test Status">
                    <IconButton onClick={resetTests} disabled={isRunning}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>

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
              {filteredTests.map((test, index) => (
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
                          {test.duration && `Duration: ${test.duration}s`}
                        </Box>
                      }
                    />
                    {getStatusChip(test.status)}
                  </ListItem>
                </motion.div>
              ))}
            </List>
          </CardContent>
        </Card>
      </Box>
    </motion.div>
  );
}

export default ExecutionPanel;