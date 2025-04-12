import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Collapse,
  TableSortLabel,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  DragIndicator as DragIndicatorIcon,
  Download as DownloadIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';

interface ApiRequest {
  name: string;
  method: string;
  endpoint: string;
  headers: string;
  body: string;
  expectedStatus: number;
  suite: string;
  assertions: Assertion[];
  environment: string;
  id: string;
}

interface Assertion {
  field: string;
  operator: string;
  value: string;
  type: string;
  validationType?: 'value' | 'schema';
  schema?: string;
}

interface Environment {
  name: string;
  baseUrl: string;
  parameters: { [key: string]: string };
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
  environment: '',
  id: '',
};

const STORAGE_KEYS = {
  API_REQUESTS: 'test_automation_api_requests',
  ENVIRONMENTS: 'test_automation_environments',
  SELECTED_ENVIRONMENT: 'test_automation_selected_environment'
};

export const TEST_SUITES = {
  SMOKE: 'smoke',
  REGRESSION: 'regression',
  SANITY: 'sanity',
  PERFORMANCE: 'performance',
};

interface ExpandedState {
  [key: number]: boolean;
}

function ApiRequestsPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const [apiRequests, setApiRequests] = useState<ApiRequest[]>([]);
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);
  const [currentApiRequest, setCurrentApiRequest] = useState<ApiRequest>(defaultApiRequest);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string>('');

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedRequests = localStorage.getItem(STORAGE_KEYS.API_REQUESTS);
        const savedEnvironments = localStorage.getItem(STORAGE_KEYS.ENVIRONMENTS);

        if (savedRequests) {
          setApiRequests(JSON.parse(savedRequests));
        }

        if (savedEnvironments) {
          const parsedEnvironments = JSON.parse(savedEnvironments);
          setEnvironments(parsedEnvironments);
          
          // Load the last selected environment
          const savedSelectedEnv = localStorage.getItem(STORAGE_KEYS.SELECTED_ENVIRONMENT);
          if (savedSelectedEnv && parsedEnvironments.some((env: Environment) => env.name === savedSelectedEnv)) {
            setSelectedEnvironment(savedSelectedEnv);
          } else if (parsedEnvironments.length > 0) {
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
  }, [enqueueSnackbar]);

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
        const assertions = currentApiRequest.assertions?.map(assertion => {
          if (assertion.validationType === 'schema' && assertion.schema) {
            try {
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

        const newRequest: ApiRequest = {
          name: currentApiRequest.name,
          method: currentApiRequest.method,
          endpoint: currentApiRequest.endpoint,
          headers: currentApiRequest.headers,
          body: currentApiRequest.body,
          expectedStatus: currentApiRequest.expectedStatus,
          suite: currentApiRequest.suite,
          assertions,
          environment: selectedEnvironment,
          id: Date.now().toString(),
        };

        const updatedRequests = [...apiRequests];
        if (isEditing && editIndex !== null) {
          updatedRequests[editIndex] = newRequest;
        } else {
          updatedRequests.push(newRequest);
        }

        setApiRequests(updatedRequests);
        localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(updatedRequests));
        setIsApiDialogOpen(false);
        enqueueSnackbar('API request saved successfully', { variant: 'success' });
      } catch (error) {
        console.error('Error saving API request:', error);
        enqueueSnackbar(error instanceof Error ? error.message : 'Error saving API request', { variant: 'error' });
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(apiRequests);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setApiRequests(items);
    localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(items));
  };

  const getSuiteColor = (suite: string) => {
    const colors: { [key: string]: { background: string; text: string } } = {
      [TEST_SUITES.SMOKE]: { background: '#e8f5e9', text: '#2e7d32' }, // Pastel green
      [TEST_SUITES.REGRESSION]: { background: '#e3f2fd', text: '#1565c0' }, // Pastel blue
      [TEST_SUITES.SANITY]: { background: '#fff3e0', text: '#ef6c00' }, // Pastel orange
      [TEST_SUITES.PERFORMANCE]: { background: '#fce4ec', text: '#c2185b' }, // Pastel pink
    };
    return colors[suite] || { background: '#f5f5f5', text: '#616161' }; // Default pastel gray
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

  const handleCopyRequest = (request: ApiRequest) => {
    // Find the highest number used in existing copies
    const copyRegex = /\((\d+)\)$/;
    const existingCopies = apiRequests
      .filter(r => r.name.startsWith(request.name))
      .map(r => {
        const match = r.name.match(copyRegex);
        return match ? parseInt(match[1]) : 0;
      });
    
    const nextCopyNumber = Math.max(0, ...existingCopies) + 1;
    const newRequest: ApiRequest = {
      ...request,
      name: `${request.name} (${nextCopyNumber})`,
      id: Date.now().toString(),
    };
    setApiRequests(prev => [...prev, newRequest]);
    localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify([...apiRequests, newRequest]));
    enqueueSnackbar(`API request "${newRequest.name}" copied successfully`, { 
      variant: 'success',
      autoHideDuration: 3000,
      anchorOrigin: { vertical: 'top', horizontal: 'right' }
    });
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteDialogOpen(true);
    setRequestToDelete(id);
  };

  const confirmDelete = () => {
    const updatedRequests = apiRequests.filter(request => request.id !== requestToDelete);
    setApiRequests(updatedRequests);
    localStorage.setItem(STORAGE_KEYS.API_REQUESTS, JSON.stringify(updatedRequests));
    setDeleteDialogOpen(false);
    enqueueSnackbar('API request deleted successfully', { variant: 'success' });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          API Requests
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
          >
            Template
          </Button>
          <Button
            variant="outlined"
            size="small"
            component="label"
            startIcon={<UploadFileIcon />}
          >
            Import
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleApiDialogOpen}
          >
            Add Request
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  API Requests
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Select Environment</InputLabel>
                  <Select
                    value={selectedEnvironment}
                    label="Select Environment"
                    onChange={(e) => setSelectedEnvironment(e.target.value)}
                  >
                    {environments.map((env) => (
                      <MenuItem key={env.name} value={env.name}>
                        {env.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="apiRequests">
                  {(provided) => (
                    <TableContainer 
                      component={Paper} 
                      variant="outlined"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell width="40px"></TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell>Endpoint</TableCell>
                            <TableCell>Suite</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {apiRequests.map((request, index) => (
                            <Draggable key={request.name} draggableId={request.name} index={index}>
                              {(provided, snapshot) => (
                                <React.Fragment>
                                  <TableRow
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                      background: snapshot.isDragging ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                                    }}
                                  >
                                    <TableCell {...provided.dragHandleProps} sx={{ cursor: 'move', width: '40px' }}>
                                      <DragIndicatorIcon fontSize="small" />
                                    </TableCell>
                                    <TableCell>{request.name}</TableCell>
                                    <TableCell>{request.method}</TableCell>
                                    <TableCell>{request.endpoint}</TableCell>
                                    <TableCell>
                                      <Chip 
                                        label={request.suite} 
                                        sx={{ 
                                          backgroundColor: getSuiteColor(request.suite).background,
                                          color: getSuiteColor(request.suite).text,
                                          '&:hover': {
                                            backgroundColor: getSuiteColor(request.suite).background,
                                            opacity: 0.8
                                          }
                                        }}
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell>{request.expectedStatus}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={() => handleEditApiRequest(index)}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleCopyRequest(request)}
                                        >
                                          <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleDeleteRequest(request.id)}
                                          color="error"
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                      <Collapse in={expanded[index]} timeout="auto" unmountOnExit>
                                        <Box sx={{ margin: 1 }}>
                                          <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                              <Typography variant="subtitle2">Headers:</Typography>
                                              <pre style={{ 
                                                backgroundColor: '#f5f5f5',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                overflow: 'auto',
                                                fontSize: '0.875rem'
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
                                                overflow: 'auto',
                                                fontSize: '0.875rem'
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
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                helperText={
                  selectedEnvironment
                    ? `Base URL: ${environments.find(env => env.name === selectedEnvironment)?.baseUrl}
                    Use parameters with ${'{paramName}'} syntax, e.g., /users?name=${'{name}'}&age=${'{age}'}`
                    : 'Please select an environment first'
                }
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
          <Button onClick={handleApiRequestSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this API request? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ApiRequestsPanel; 