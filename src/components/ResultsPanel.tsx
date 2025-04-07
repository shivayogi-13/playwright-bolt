import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import EmailIcon from '@mui/icons-material/Email';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

function ResultsPanel() {
  const [testResults] = useState({
    passed: 15,
    failed: 2,
    skipped: 1,
  });

  const [trendData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    passed: [12, 15, 13, 14, 15],
    failed: [3, 2, 1, 2, 2],
    skipped: [1, 1, 2, 1, 1],
  });

  const barData = {
    labels: ['Passed', 'Failed', 'Skipped'],
    datasets: [
      {
        label: 'Test Results',
        data: [testResults.passed, testResults.failed, testResults.skipped],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieData = {
    labels: ['Passed', 'Failed', 'Skipped'],
    datasets: [
      {
        data: [testResults.passed, testResults.failed, testResults.skipped],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const lineData = {
    labels: trendData.labels,
    datasets: [
      {
        label: 'Passed',
        data: trendData.passed,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      },
      {
        label: 'Failed',
        data: trendData.failed,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
      },
      {
        label: 'Skipped',
        data: trendData.skipped,
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        fill: true,
      },
    ],
  };

  const sendEmail = () => {
    console.log('Sending email report...');
  };

  const downloadReport = () => {
    console.log('Downloading report...');
  };

  const refreshData = () => {
    console.log('Refreshing data...');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            Test Results
          </Typography>
          <Box>
            <Tooltip title="Refresh Data">
              <IconButton onClick={refreshData} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Report">
              <IconButton onClick={downloadReport} sx={{ mr: 1 }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<EmailIcon />}
              onClick={sendEmail}
              sx={{
                borderRadius: 2,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              Email Report
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Test Results Trend
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={lineData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Test Results Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Test Results Summary
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Pie 
                    data={pieData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Summary Statistics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="primary.main">
                        {testResults.passed + testResults.failed + testResults.skipped}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Total Tests
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="success.main">
                        {testResults.passed}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Passed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="error.main">
                        {testResults.failed}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Failed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="warning.main">
                        {testResults.skipped}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Skipped
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
}

export default ResultsPanel;