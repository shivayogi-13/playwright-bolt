import React, { useState } from 'react';

const CookieCapture: React.FC = () => {
  const [url, setUrl] = useState('');
  const [cookies, setCookies] = useState<{ name: string; value: string; domain: string; path: string }[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchCookies = async () => {
    try {
      const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return {
          name: name.trim(),
          value: value.trim(),
          domain: window.location.hostname,
          path: '/'
        };
      });
      // Update state and localStorage as needed
      setCookies(cookies);
      localStorage.setItem('capturedCookies', JSON.stringify(cookies));
      setError('');
    } catch (err) {
      setError('Failed to fetch cookies');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cookie Capture</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          URL to capture cookies from:
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter URL"
        />
      </div>

      <button
        onClick={fetchCookies}
        disabled={isLoading || !url}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
      >
        {isLoading ? 'Fetching...' : 'Fetch Cookies'}
      </button>

      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {cookies.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Captured Cookies:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(cookies, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CookieCapture; 