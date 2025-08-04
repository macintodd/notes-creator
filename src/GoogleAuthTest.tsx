import React, { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import WorksheetService from './services/WorksheetService';  // Change this line
import { Worksheet } from './types/Worksheet';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function GoogleAuthContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('Auth Success:', tokenResponse);
      setIsAuthenticated(true);
      setAccessToken(tokenResponse.access_token);
      setErrorDetails(null);
      
      try {
        const worksheetService = new WorksheetService(tokenResponse.access_token);
        await worksheetService.saveWorksheet({
          title: "Test Worksheet",
          problems: [
            { 
              question: "2 + 2", 
              answer: "4",
              type: "addition"
            }
          ],
          createdAt: new Date().toISOString()
        });
        setDriveStatus('Drive access confirmed');
      } catch (error) {
        console.error('Drive access failed:', error);
        setDriveStatus('Drive access failed');
        setErrorDetails(error instanceof Error ? error.message : 'Unknown error');
      }
    },
    onError: (error) => {
      console.error('Auth Failed:', error);
      setIsAuthenticated(false);
      setDriveStatus('');
      setErrorDetails(error instanceof Error ? error.message : 'Authentication failed');
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  const handleSaveTest = async () => {
    if (!accessToken) return;

    try {
      const worksheetService = new WorksheetService(accessToken);
      const testData: Worksheet = {
        title: "Test Worksheet",
        problems: [
          { 
            question: "2 + 2", 
            answer: "4",
            type: "addition"
          }
        ],
        createdAt: new Date().toISOString()
      };
      
      await worksheetService.saveWorksheet(testData);
      setDriveStatus('Test worksheet saved successfully');
    } catch (error) {
      console.error('Save failed:', error);
      setErrorDetails(error instanceof Error ? error.message : 'Failed to save worksheet');
    }
  };

  return (
    <div style={{ 
      padding: '10px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {!isAuthenticated ? (
        <button 
          onClick={() => login()}
          style={{
            padding: '10px 20px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: '#fff',
            cursor: 'pointer'
          }}
        >
          Sign in with Google
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="https://www.google.com/images/icons/product/drive-32.png" 
              alt="Drive" 
              style={{ width: 24, height: 24 }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#4CAF50' }}>Connected to Google</span>
              <span style={{ fontSize: '0.8em', color: '#666' }}>{driveStatus}</span>
            </div>
          </div>
          {errorDetails && (
            <div style={{ 
              fontSize: '0.8em', 
              color: '#D32F2F',
              backgroundColor: '#FFEBEE',
              padding: '8px',
              borderRadius: '4px'
            }}>
              Error: {errorDetails}
            </div>
          )}
          <button 
            onClick={handleSaveTest}
            style={{
              padding: '10px 20px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            Save Test Worksheet
          </button>
        </>
      )}
    </div>
  );
}

export function GoogleAuthTest() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <GoogleAuthContent />
    </GoogleOAuthProvider>
  );
}