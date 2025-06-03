import React, { useState } from 'react';

const CookieCapture = () => {
    const [url, setUrl] = useState('');
    const [cookies, setCookies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const captureCookies = async () => {
        setLoading(true);
        setError(null);
        setCookies([]);

        try {
            const response = await fetch('/api/capture-cookies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to capture cookies');
            }

            const data = await response.json();
            setCookies(data.cookies);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="mb-4">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter URL to capture cookies"
                    className="w-full p-2 border rounded"
                />
                <button
                    onClick={captureCookies}
                    disabled={loading || !url}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                    {loading ? 'Capturing...' : 'Capture Cookies'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                    Error: {error}
                </div>
            )}

            {cookies.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Cookies:</h3>
                    <div className="bg-gray-50 p-4 rounded">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">Name</th>
                                    <th className="text-left">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cookies.map((cookie, index) => (
                                    <tr key={index} className="border-t">
                                        <td className="py-2">{cookie.name}</td>
                                        <td className="py-2">{cookie.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CookieCapture; 