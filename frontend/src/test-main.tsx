import React from 'react';
import ReactDOM from 'react-dom/client';

// Super simple test component
function TestApp() {
  return (
    <div style={{
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#0ea5e9', marginBottom: '20px' }}>
        🧠 NeurallEmpire React Test
      </h1>
      
      <div style={{
        background: '#f0f9ff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>✅ React is Working!</h2>
        <p>If you can see this, React is rendering correctly.</p>
      </div>

      <div style={{
        background: '#fff7ed',
        padding: '20px',
        borderRadius: '8px',
        border: '2px solid #fb923c'
      }}>
        <h3>🔍 Diagnostics:</h3>
        <ul>
          <li><strong>Current URL:</strong> {window.location.href}</li>
          <li><strong>Hostname:</strong> {window.location.hostname}</li>
          <li><strong>Port:</strong> {window.location.port}</li>
          <li><strong>React Version:</strong> {React.version}</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <a 
          href="/" 
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#0ea5e9',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px'
          }}
        >
          Try Loading Real App
        </a>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
