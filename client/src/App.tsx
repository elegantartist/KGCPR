import { useState } from 'react'

function App() {
  const [apiResponse, setApiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleTestApiClick = async () => {
    setIsLoading(true);
    setApiResponse('');
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiResponse(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>KGCPR Foundation</h1>
      <p>Frontend is running. Now, let's test the backend connection.</p>
      <button onClick={handleTestApiClick} disabled={isLoading}>
        {isLoading ? 'Testing...' : 'Test /api/health Endpoint'}
      </button>
      <div style={{ marginTop: '1rem' }}>
        <h2>API Response:</h2>
        <pre style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '4px', minHeight: '50px' }}>
          {apiResponse}
        </pre>
      </div>
    </div>
  );
}

export default App;
