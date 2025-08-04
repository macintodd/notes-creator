// App.js
import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import WorksheetCanvas from './WorksheetCanvas';
import ModePicker from './ModePicker';
import AssetManager from './AssetManager';
import DocManager from './DocManager';
import DriveService from './DriveService';
import './App.css';
import './ModePicker.css';
import './WorksheetCanvas.css';
import './AssetManager.css';
import './DocManager.css';

const CLIENT_ID = '348553692233-mfqod16j10n6tl3dvru9jk6chvff7mmq.apps.googleusercontent.com';

// Create inner component to use hooks
function AppContent() {
  const worksheetRef = useRef();
  const problemSetRef = useRef();
  const scrollRef = useRef(null);
  const zoomWrapperRef = useRef(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const driveServiceRef = useRef(null); // Add this ref to store the service
  
  const [zoom, setZoom] = useState(1);
  const [currentMode, setCurrentMode] = useState('Text');
  const [isAssetManagerVisible, setIsAssetManagerVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [usedProblems, setUsedProblems] = useState([]);
  const [modePickerPosition, setModePickerPosition] = useState({ x: 20, y: 20 });
  const [docManagerPosition, setDocManagerPosition] = useState({ x: 20, y: 100 });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [accessToken, setAccessToken] = useState(null);
  const [driveService, setDriveService] = useState(null);
  const [currentFile, setCurrentFile] = useState(() => {
    // Try to load from localStorage on startup
    const saved = localStorage.getItem('currentWorksheetFile');
    return saved ? JSON.parse(saved) : null;
  });
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);

  // Persist currentFile to localStorage whenever it changes
  useEffect(() => {
    if (currentFile) {
      localStorage.setItem('currentWorksheetFile', JSON.stringify(currentFile));
    } else {
      localStorage.removeItem('currentWorksheetFile');
    }
  }, [currentFile]);

  // Track mouse position
  const handleMouseMove = (e) => {
    if (!zoomWrapperRef.current) return;
    const rect = zoomWrapperRef.current.getBoundingClientRect();
    mousePositionRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Mouse-centered zooming
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY;
        const container = scrollRef.current;
        const zoomWrapper = zoomWrapperRef.current;
        const oldZoom = zoom;
        let newZoom = oldZoom - delta * 0.001;
        newZoom = Math.min(2, Math.max(0.5, newZoom));

        const scale = newZoom / oldZoom;
        const { x, y } = mousePositionRef.current;

        const scrollX = container.scrollLeft;
        const scrollY = container.scrollTop;

        const newScrollX = (x * scale) - (x - scrollX);
        const newScrollY = (y * scale) - (y - scrollY);

        setZoom(newZoom);

        requestAnimationFrame(() => {
          container.scrollLeft = newScrollX;
          container.scrollTop = newScrollY;
        });
      }
    };

    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener("wheel", handleWheel);
      }
    };
  }, [zoom]);

  // Handler to mark a problem as used
  const handleProblemUsed = (problemId) => {
    setUsedProblems((prev) => {
      const newUsedProblems = [...new Set([...prev, problemId])];
      return newUsedProblems;
    });
  };

  // Handler to load used problems (when loading a worksheet)
  const handleLoadUsedProblems = (usedProblemsList) => {
    setUsedProblems(usedProblemsList || []);
  };

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clean up any pending operations
      if (accessToken) {
        setAccessToken(null);
      }
      if (driveService) {
        setDriveService(null);
      }
    };
  }, [accessToken, driveService]);

  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('Login success, token:', tokenResponse.access_token.substring(0, 20) + '...');
      try {
        setAccessToken(tokenResponse.access_token);
        
        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user info');
        }
        
        const userInfo = await userResponse.json();
        console.log('User info:', userInfo);
        setUserName(userInfo.name);
        
        // Initialize Drive service
        console.log('Creating DriveService...');
        const service = new DriveService(tokenResponse.access_token);
        console.log('DriveService created:', service);
        
        console.log('Testing drive access...');
        await service.testAccess();
        console.log('Drive access test passed');
        
        console.log('Setting driveService state and ref...');
        driveServiceRef.current = service; // Store in ref immediately
        setDriveService(service);
        console.log('Setting isLoggedIn to true...');
        setIsLoggedIn(true);
        console.log('Login process completed successfully');
        console.log('driveServiceRef.current:', driveServiceRef.current);
        
      } catch (error) {
        console.error('Auth error:', error);
        setIsLoggedIn(false);
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      setIsLoggedIn(false);
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile'
  });

  const handleSave = async (requestedFileName = null) => {
    console.log('=== SAVE DEBUG INFO ===');
    console.log('handleSave called with filename:', requestedFileName);
    console.log('driveService:', driveService);
    console.log('driveServiceRef.current:', driveServiceRef.current);
    console.log('isLoggedIn:', isLoggedIn);
    console.log('worksheetRef.current:', worksheetRef.current);
    console.log('accessToken exists:', !!accessToken);
    console.log('currentFile:', currentFile);
    console.log('========================');
    
    // Use the ref version as fallback
    const serviceToUse = driveService || driveServiceRef.current;
    
    if (!serviceToUse) {
      console.error('Drive service not available');
      return;
    }
    
    if (!worksheetRef.current) {
      console.error('Worksheet ref not available');
      return;
    }

    try {
      console.log('Attempting to export data...');
      const worksheetData = worksheetRef.current?.exportData();
      console.log('Exported data:', worksheetData);
      
      if (!worksheetData) {
        console.error('No worksheet data returned from exportData()');
        return;
      }

      // Get header data from worksheet or use requested filename
      const headerData = worksheetData.header || {};
      const fileName = requestedFileName || `U${headerData.unit || ''}L${headerData.lesson || ''}${headerData.title || 'Worksheet'}`;
      const unitNumber = headerData.unit || '1';

      console.log('Saving with filename:', fileName);
      
      // Get problem sets data from AssetManager
      const problemSetsData = problemSetRef.current?.exportProblemSets?.() || {};
      
      // Create enhanced worksheet format
      const enhancedWorksheetData = {
        version: "2.0",
        metadata: {
          title: fileName,
          unit: headerData.unit || '',
          lesson: headerData.lesson || '',
          created: currentFile?.created || new Date().toISOString(),
          modified: new Date().toISOString(),
          problemSetsUsed: Object.keys(problemSetsData)
        },
        layout: {
          ...worksheetData,
          usedProblems: usedProblems || []
        },
        problemSets: problemSetsData,
        tableSettings: worksheetRef.current?.exportTableSettings?.() || {}
      };
      
      // Check if this is the same file we're already working on
      const isSameFile = currentFile && currentFile.title === fileName;
      
      // Try new unit-based save first, fall back to legacy if needed
      let response;
      try {
        if (isSameFile && currentFile.id) {
          // Update existing file using legacy method for now
          response = await serviceToUse.saveWorksheet({
            title: fileName,
            content: enhancedWorksheetData,
            fileId: currentFile.id
          });
        } else {
          // Use new unit-based save
          response = await serviceToUse.saveWorksheetToUnit({
            title: fileName,
            content: enhancedWorksheetData
          }, unitNumber);
        }
      } catch (unitSaveError) {
        console.log('Unit-based save failed, falling back to legacy save:', unitSaveError);
        // Fall back to legacy save method
        response = await serviceToUse.saveWorksheet({
          title: fileName,
          content: enhancedWorksheetData,
          fileId: isSameFile ? currentFile.id : null
        });
      }

      // Handle the response - check if user decision is needed for duplicate
      if (response.needsUserDecision) {
        console.log('Duplicate file found, showing dialog');
        setPendingSave({
          title: fileName,
          content: enhancedWorksheetData,
          existingFile: response.existingFile,
          unitNumber: unitNumber
        });
        setShowOverwriteDialog(true);
        return;
      }

      // Save individual problem sets as separate reusable files
      if (Object.keys(problemSetsData).length > 0) {
        console.log('Saving individual problem sets...');
        for (const [setName, problems] of Object.entries(problemSetsData)) {
          try {
            const problemSetFileName = `U${unitNumber}L${headerData.lesson || ''}${setName}`;
            console.log(`Saving problem set: ${problemSetFileName}`);
            
            await serviceToUse.saveProblemSet(unitNumber, problemSetFileName, problems);
            console.log(`Problem set saved: ${problemSetFileName}`);
          } catch (problemSetError) {
            console.error(`Failed to save problem set ${setName}:`, problemSetError);
            // Continue with other problem sets even if one fails
          }
        }
      }

      setCurrentFile({
        id: response.id,
        title: fileName,
        created: enhancedWorksheetData.metadata.created
      });
      
      console.log('Worksheet saved successfully');
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  // New function to handle "Save As New" option
  const handleSaveAsNew = async () => {
    if (!pendingSave) return;
    
    try {
      const serviceToUse = driveService || driveServiceRef.current;
      const response = await serviceToUse.saveWorksheetForced({
        title: pendingSave.title,
        content: pendingSave.content
      });
      
      setCurrentFile({
        id: response.id,
        title: pendingSave.title
      });
      
      console.log('New worksheet created successfully');
    } catch (error) {
      console.error('Save as new failed:', error);
    } finally {
      setShowOverwriteDialog(false);
      setPendingSave(null);
    }
  };

  // New function to handle "Overwrite Existing" option
  const handleOverwriteExisting = async () => {
    if (!pendingSave) return;
    
    try {
      const serviceToUse = driveService || driveServiceRef.current;
      const response = await serviceToUse.saveWorksheetForced({
        title: pendingSave.title,
        content: pendingSave.content
      }, pendingSave.existingFile.id);
      
      setCurrentFile({
        id: response.id,
        title: pendingSave.title
      });
      
      console.log('Existing worksheet overwritten successfully');
    } catch (error) {
      console.error('Overwrite failed:', error);
    } finally {
      setShowOverwriteDialog(false);
      setPendingSave(null);
    }
  };

  // Enhanced confirmation dialog component
  const OverwriteDialog = () => {
    if (!showOverwriteDialog || !pendingSave) return null;

    const handleCancel = () => {
      setShowOverwriteDialog(false);
      setPendingSave(null);
      
      // Create a simple notification that appears briefly
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 15px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1100;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        color: #495057;
        max-width: 300px;
      `;
      notification.innerHTML = `
        <strong>Save cancelled</strong><br>
        Change the Unit, Lesson, or Title to save as a unique file
      `;
      
      document.body.appendChild(notification);
      
      // Remove notification after 4 seconds
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 4000);
    };

    return (
      <div className="dialog-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div className="dialog" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          minWidth: '450px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>File Already Exists</h3>
          <p style={{ margin: '0 0 10px 0' }}>
            A worksheet named <strong>"{pendingSave.title}"</strong> already exists in your Google Drive.
          </p>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
            Last modified: {new Date(pendingSave.existingFile.modifiedTime).toLocaleString()}
          </p>
          <p style={{ margin: '0 0 20px 0', fontWeight: '500' }}>What would you like to do?</p>
          
          <div className="dialog-buttons" style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            marginTop: '20px'
          }}>
            <button 
              onClick={handleOverwriteExisting}
              style={{
                padding: '10px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Overwrite Existing
            </button>
            <button 
              onClick={handleSaveAsNew}
              style={{
                padding: '10px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Save as New File
            </button>
            <button 
              onClick={handleCancel}
              style={{
                padding: '10px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              title="Cancel and change Unit/Lesson/Title to save as unique file"
            >
              Cancel
            </button>
          </div>
          <p style={{ 
            margin: '15px 0 0 0', 
            fontSize: '12px', 
            color: '#666', 
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Tip: Change the Unit, Lesson, or Title to create a unique filename
          </p>
        </div>
      </div>
    );
  };

  const handleLoad = async () => {
    console.log('=== LOAD DEBUG INFO ===');
    console.log('handleLoad called');
    console.log('driveService:', driveService);
    console.log('driveServiceRef.current:', driveServiceRef.current);
    console.log('driveService type:', typeof driveService);
    console.log('isLoggedIn:', isLoggedIn);
    console.log('========================');
    
    // Use the ref version as fallback (same pattern as save function)
    const serviceToUse = driveService || driveServiceRef.current;
    
    if (!serviceToUse) {
      console.error('Drive service not available for load');
      return;
    }

    try {
      console.log('Attempting to load worksheet...');
      // Load worksheet
      const file = await serviceToUse.loadWorksheet();
      console.log('Loaded file:', file);
      
      if (file) {
        const worksheetData = file.content;
        
        // Load worksheet layout
        if (worksheetRef.current?.loadData) {
          worksheetRef.current.loadData(worksheetData);
        } else {
          console.warn('worksheetRef.current.loadData method not available');
        }
        
        // Load problem sets if they exist in the worksheet data
        if (worksheetData.version === "2.0" && worksheetData.problemSets) {
          console.log('Loading embedded problem sets:', Object.keys(worksheetData.problemSets));
          if (problemSetRef.current?.loadProblemSets) {
            problemSetRef.current.loadProblemSets(worksheetData.problemSets);
          }
          
          // Load used problems from layout data
          if (worksheetData.layout && worksheetData.layout.usedProblems) {
            handleLoadUsedProblems(worksheetData.layout.usedProblems);
          }
        } else {
          // Legacy: try to load problem sets from separate file
          if (problemSetRef.current?.loadProblemSetsFromFile) {
            await problemSetRef.current.loadProblemSetsFromFile();
          }
          
          // Load used problems from legacy format
          if (worksheetData.usedProblems) {
            handleLoadUsedProblems(worksheetData.usedProblems);
          }
        }
        
        setCurrentFile({
          id: file.id,
          title: file.title,
          created: worksheetData.metadata?.created
        });
        
        console.log('Load completed successfully');
      } else {
        console.log('No files found to load');
      }
    } catch (error) {
      console.error('Load failed:', error);
    }
  };

  return (
    <div className="app-content">
      <WorksheetCanvas
        ref={worksheetRef}
        snapToGrid={snapToGrid}
        zoom={zoom}
        onHeaderChange={(headerData) => {
          worksheetRef.current?.handleHeaderChange(headerData);
        }}
        onProblemUsed={handleProblemUsed}
        onLoadUsedProblems={handleLoadUsedProblems}
      />
      <DocManager
        position={docManagerPosition}
        onDrag={(newPos) => setDocManagerPosition(newPos)}
        isLoggedIn={isLoggedIn}
        userName={userName}
        onLogin={handleLogin}
        onSave={handleSave}
        onLoad={handleLoad}
        zoom={zoom}
        setZoom={setZoom}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(prev => !prev)}
        onHeaderChange={(headerData) => {
          worksheetRef.current?.handleHeaderChange(headerData);
        }}
        ref={problemSetRef}
      />

      <AssetManager
        isVisible={isAssetManagerVisible}
        onPlaceTable={(config) => {
          if (worksheetRef.current) {
            worksheetRef.current.handleAddTable(config);
          }
        }}
        usedProblems={usedProblems}
        ref={problemSetRef}
      />

      <OverwriteDialog />
    </div>
  );
}

// Main App component
function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}

export default App;