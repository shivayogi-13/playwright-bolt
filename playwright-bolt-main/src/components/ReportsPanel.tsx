import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { PieChart, BarChart, LineChart } from '@mui/x-charts';
import { TEST_SUITES } from './ApiRequestsPanel';

// Pastel color schemes
const pastelColors = {
  success: '#e8f5e9', // Pastel green
  error: '#ffebee',   // Pastel red
  warning: '#fff3e0', // Pastel orange
  info: '#e3f2fd',    // Pastel blue
  primary: '#f3e5f5', // Pastel purple
  secondary: '#fce4ec' // Pastel pink
};

const pastelTextColors = {
  success: '#2e7d32', // Dark green
  error: '#c62828',   // Dark red
  warning: '#ef6c00', // Dark orange
  info: '#1565c0',    // Dark blue
  primary: '#6a1b9a', // Dark purple
  secondary: '#c2185b' // Dark pink
};

function ReportsPanel() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const [lineChartData, setLineChartData] = useState<any[]>([]);

  // Update the getSuiteColor function
  const getSuiteColor = (suite: string) => {
    const colors: { [key: string]: { background: string; text: string } } = {
      [TEST_SUITES.SMOKE]: { background: pastelColors.success, text: pastelTextColors.success },
      [TEST_SUITES.REGRESSION]: { background: pastelColors.info, text: pastelTextColors.info },
      [TEST_SUITES.SANITY]: { background: pastelColors.warning, text: pastelTextColors.warning },
      [TEST_SUITES.PERFORMANCE]: { background: pastelColors.secondary, text: pastelTextColors.secondary },
    };
    return colors[suite] || { background: '#f5f5f5', text: '#616161' };
  };

  // Update the pie chart colors
  const pieChartColors = [
    pastelColors.success,
    pastelColors.error,
    pastelColors.warning,
    pastelColors.info,
    pastelColors.primary,
    pastelColors.secondary
  ];

  // Update the bar chart colors
  const barChartColors = {
    success: pastelColors.success,
    error: pastelColors.error,
    warning: pastelColors.warning,
    info: pastelColors.info
  };

  // Update the line chart colors
  const lineChartColors = {
    success: pastelTextColors.success,
    error: pastelTextColors.error,
    warning: pastelTextColors.warning,
    info: pastelTextColors.info
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Results Overview
              </Typography>
              <PieChart
                series={[
                  {
                    data: pieChartData,
                    innerRadius: 0,
                    outerRadius: 80,
                    paddingAngle: 5,
                    cornerRadius: 5,
                    startAngle: -90,
                    endAngle: 270,
                    cx: 150,
                    cy: 150,
                  },
                ]}
                width={400}
                height={300}
                colors={pieChartColors}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <BarChart
                series={[
                  {
                    data: barChartData,
                    color: barChartColors.success,
                  },
                ]}
                width={500}
                height={300}
                sx={{
                  '& .MuiBarElement-root': {
                    fill: barChartColors.success,
                    stroke: '#fff',
                    strokeWidth: 1,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Execution Trend
              </Typography>
              <LineChart
                series={[
                  {
                    data: lineChartData,
                    color: lineChartColors.success,
                  },
                ]}
                width={500}
                height={300}
                sx={{
                  '& .MuiLineElement-root': {
                    stroke: lineChartColors.success,
                    strokeWidth: 2,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ReportsPanel; 