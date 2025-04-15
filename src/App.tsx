import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Container,
  Tab,
  Tabs,
  Typography,
  Paper,
  useTheme,
  Toolbar,
} from '@mui/material';
import { motion } from 'framer-motion';
import { SnackbarProvider } from 'notistack';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import ConfigurationPanel from './components/ConfigurationPanel';
import ExecutionPanel from './components/ExecutionPanel';
import ResultsPanel from './components/ResultsPanel';
import ApiRequestsPanel from './components/ApiRequestsPanel';
import AddIcon from '@mui/icons-material/Add';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </Box>
      )}
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <SnackbarProvider 
      maxSnack={3}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Box sx={{ flexGrow: 1, bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppBar 
          position="static" 
          sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
          }}
        >
          <Container>
            <Toolbar>
              <Typography 
                variant="h4" 
                component="div" 
                sx={{ 
                  p: 2, 
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                Test Automation Dashboard
              </Typography>
            </Toolbar>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '1rem',
                },
                '& .Mui-selected': {
                  color: '#fff !important',
                  fontWeight: 'bold',
                },
              }}
            >
              <Tab icon={<SettingsIcon />} label="Configuration" />
              <Tab icon={<AddIcon />} label="API Requests" />
              <Tab icon={<PlayArrowIcon />} label="Execution" />
              <Tab icon={<AssessmentIcon />} label="Reports" />
            </Tabs>
          </Container>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Paper 
            elevation={3}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
            }}
          >
            <TabPanel value={currentTab} index={0}>
              <ConfigurationPanel />
            </TabPanel>
            <TabPanel value={currentTab} index={1}>
              <ApiRequestsPanel />
            </TabPanel>
            <TabPanel value={currentTab} index={2}>
              <ExecutionPanel />
            </TabPanel>
            <TabPanel value={currentTab} index={3}>
              <ResultsPanel />
            </TabPanel>
          </Paper>
        </Container>
      </Box>
    </SnackbarProvider>
  );
}

export default App;