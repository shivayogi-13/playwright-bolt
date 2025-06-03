import React from 'react';
import ReactDOM from 'react-dom/client';
import CookieCapture from './components/CookieCapture';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Cookie Capture Tool</h1>
        <CookieCapture />
      </div>
    </div>
  </React.StrictMode>
); 