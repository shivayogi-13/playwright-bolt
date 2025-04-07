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
import * as XLSX from 'xlsx';

interface ConfigFormData {
  baseUrl: string;
  testUserEmail: string;
  testUserPassword: string;
  mfaEnabled: boolean;
  mfaSecretKey: string;
  bearerToken: string;
}

export interface ApiRequest {
  name: string;
  method: string;
  endpoint: string;
  headers: string;
  body: string;
  expectedStatus: number;
  suite: string;
}

interface ExpandedState {
  [key: number]: boolean;
}

const defaultApiRequest: ApiRequest = {
  name: '',
  method: 'GET',
  endpoint: '',
  headers: '{}',
  body: '{}',
  expectedStatus: 200,
  suite: 'regression',
};

const STORAGE_KEYS = {
  CONFIG: 'test_automation_config',
  API_REQUESTS: 'test_automation_api_requests',
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

  const { control, handleSubmit, watch, reset } = useForm<ConfigFormData>({
    defaultValues: {
      baseUrl: import.meta.env.VITE_BASE_URL || 'http://localhost:3000',
      testUserEmail: import.meta.env.VITE_TEST_USER_EMAIL || '',
      testUserPassword: import.meta.env.VITE_TEST_USER_PASSWORD || '',
      mfaEnabled: true,
      mfaSecretKey: import.meta.env.VITE_MFA_SECRET_KEY || '',
      bearerToken: '',
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
    setIsApiDialogOpen(true);
  };

  const handleApiDialogClose = () => {
    setIsApiDialogOpen(false);
  };

  const handleApiRequestSave = () => {
    if (currentApiRequest.name && currentApiRequest.endpoint) {
      try {
        let headers = {};
        try {
          headers = JSON.parse(currentApiRequest.headers);
        } catch (e) {
          headers = {};
        }
        
        if (bearerToken) {
          headers = {
            ...headers,
            Authorization: `Bearer ${bearerToken}`,
          };
        }

        const newRequest = {
          ...currentApiRequest,
          headers: JSON.stringify(headers, null, 2),
        };

        const updatedRequests = [...apiRequests, newRequest];
        setApiRequests(updatedRequests);
        localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(updatedRequests));
        setIsApiDialogOpen(false);
        enqueueSnackbar('API request added successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Error saving API request', { variant: 'error' });
      }
    } else {
      enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
    }
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
                <Controller
                  name="mfaEnabled"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Enable MFA Testing
                        </Typography>
                      }
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="mfaSecretKey"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="MFA Secret Key"
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
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteApiRequest(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
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
        <DialogTitle>Add API Request</DialogTitle>
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