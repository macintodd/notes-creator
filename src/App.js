// App.js
import React, { useState, useEffect, useRef } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import WorksheetCanvas from './WorksheetCanvas';
import ModePicker from './ModePicker';
import AssetManager from './AssetManager';
import DriveService from './DriveService';
import './App.css';
import './ModePicker.css';
import './WorksheetCanvas.css';
import './AssetManager.css';

const CLIENT_ID = '';

// localStorage keys for persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'math_practice_access_token',
  USER_NAME: 'math_practice_user_name',
  LOGIN_TIMESTAMP: 'math_practice_login_timestamp'
};

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
  const [currentHeader, setCurrentHeader] = useState(null);

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

  // Auto-login effect - check for stored authentication on app startup
  useEffect(() => {
    const initializeAuthFromStorage = async () => {
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedUserName = localStorage.getItem(STORAGE_KEYS.USER_NAME);
      const storedTimestamp = localStorage.getItem(STORAGE_KEYS.LOGIN_TIMESTAMP);

      if (!storedToken || !storedUserName || !storedTimestamp) {
        console.log('No stored authentication found');
        return;
      }

      // Check if token is too old (older than 50 minutes, tokens expire in 1 hour)
      const loginTime = parseInt(storedTimestamp);
      const now = Date.now();
      const fiftyMinutes = 50 * 60 * 1000;

      if (now - loginTime > fiftyMinutes) {
        console.log('Stored token is too old, clearing...');
        clearStoredAuth();
        return;
      }

      console.log('Found stored authentication, attempting to restore session...');

      try {
        // Test the stored token by creating and testing Drive service
        const service = new DriveService(storedToken);
        await service.testAccess();

        // If successful, restore the session
        setAccessToken(storedToken);
        setUserName(storedUserName);
        driveServiceRef.current = service;
        setDriveService(service);
        setIsLoggedIn(true);
        
        console.log('Session restored successfully from stored authentication');
      } catch (error) {
        console.error('Stored token is invalid, clearing:', error);
        clearStoredAuth();
      }
    };

    // Only run on initial mount
    initializeAuthFromStorage();
  }, []); // Empty dependency array = run once on mount

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

  // Handler for when WorksheetCanvas updates header (e.g., during load)
  const handleWorksheetHeaderChange = (headerData) => {
    setCurrentHeader(headerData);
  };

  // Function to clear stored authentication data
  const clearStoredAuth = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_NAME);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
    console.log('Stored authentication data cleared');
  };

  // Function to logout user
  const handleLogout = () => {
    console.log('Logging out user...');
    clearStoredAuth();
    setIsLoggedIn(false);
    setUserName('');
    setAccessToken(null);
    setDriveService(null);
    driveServiceRef.current = null;
    console.log('Logout completed');
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
        
        // Store authentication data in localStorage for persistence
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenResponse.access_token);
        localStorage.setItem(STORAGE_KEYS.USER_NAME, userInfo.name);
        localStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, Date.now().toString());
        console.log('Authentication data saved to localStorage');
        
        console.log('Login process completed successfully');
        console.log('driveServiceRef.current:', driveServiceRef.current);
        
      } catch (error) {
        console.error('Auth error:', error);
        clearStoredAuth(); // Clear any potentially bad stored data
        setIsLoggedIn(false);
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      clearStoredAuth(); // Clear any potentially bad stored data
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

  // PDF Export functionality
  const handleExportPDF = async (headerInfo) => {
    try {
      console.log('=== PDF EXPORT DEBUG INFO ===');
      console.log('handleExportPDF called with header:', headerInfo);
      console.log('driveService:', driveService);
      console.log('driveServiceRef.current:', driveServiceRef.current);
      
      // Find the worksheet canvas element
      const worksheetElement = document.querySelector('.worksheet-canvas');
      if (!worksheetElement) {
        throw new Error('Worksheet canvas not found');
      }

      // Create a clone of the worksheet to modify for PDF export
      const clonedElement = worksheetElement.cloneNode(true);
      
      // Hide grid lines and drag handles in the cloned element
      const style = document.createElement('style');
      style.textContent = `
        /* Hide UI elements that shouldn't appear in PDF */
        .pdf-export-clone .grid-line { display: none !important; }
        .pdf-export-clone .drag-handle { display: none !important; }
        .pdf-export-clone .resize-handle { display: none !important; }
        .pdf-export-clone .table-wrapper .drag-handle { display: none !important; }
        .pdf-export-clone .text-box .drag-handle { display: none !important; }
        .pdf-export-clone .table-drag-handle { display: none !important; }
        .pdf-export-clone .grid-lines { display: none !important; }
        .pdf-export-clone .page-break { display: none !important; }
        .pdf-export-clone .page-break::before { display: none !important; }
        .pdf-export-clone .border-menu { display: none !important; }
        
        /* Clean up worksheet canvas */
        .pdf-export-clone .worksheet-canvas { 
          background-image: none !important; 
          border: none !important; 
          box-shadow: none !important; 
          background-color: white !important;
        }
        
        /* Remove borders from text boxes only (not tables) */
        .pdf-export-clone .text-box { 
          border: none !important; 
          box-shadow: none !important; 
          outline: none !important; 
        }
        
        /* Target text boxes more aggressively - override inline styles */
        .pdf-export-clone .react-rnd:not(.table-wrapper) > div {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        /* Additional targeting for any div that might be a text box */
        .pdf-export-clone div[contenteditable] {
          border: none !important;
        }
        
        /* Target divs with cursor move (text boxes when not editing) */
        .pdf-export-clone div[style*="cursor: move"] {
          border: none !important;
        }
        
        /* Target divs with cursor text (text boxes when editing) */
        .pdf-export-clone div[style*="cursor: text"] {
          border: none !important;
        }
        
        /* Remove borders from react-rnd wrappers for text boxes only */
        .pdf-export-clone .react-rnd:not(.table-wrapper) { 
          border: none !important; 
          box-shadow: none !important; 
          outline: none !important; 
        }
        
        .pdf-export-clone .react-rnd:not(.table-wrapper) > div { 
          border: none !important; 
          box-shadow: none !important; 
          outline: none !important; 
        }
        
        /* Keep table cell borders but remove selection styling */
        .pdf-export-clone .table-block.selected { 
          box-shadow: none !important; 
          outline: none !important;
        }
        
        /* Remove only selection/focus borders, keep structural borders */
        .pdf-export-clone .table-block { 
          box-shadow: none !important; 
          outline: none !important; 
        }
        
        /* Preserve table cell borders (they use inline styles) but remove any CSS borders */
        .pdf-export-clone .table-cell {
          box-shadow: none !important;
          outline: none !important;
          background: white !important;
          background-color: white !important;
        }
        
        /* Remove borders from text boxes and UI elements, but preserve table structure */
        .pdf-export-clone .text-box,
        .pdf-export-clone .react-rnd:not(.table-wrapper),
        .pdf-export-clone .react-rnd:not(.table-wrapper) > div,
        .pdf-export-clone div[contenteditable],
        .pdf-export-clone div[style*="cursor: move"]:not(.table-cell),
        .pdf-export-clone div[style*="cursor: text"]:not(.table-cell) {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Add class to cloned element for targeted styling
      clonedElement.classList.add('pdf-export-clone');
      
      // Position the clone off-screen
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '0';
      
      // Add to document temporarily
      document.body.appendChild(clonedElement);

      try {
        // Capture the cloned element as canvas
        const canvas = await html2canvas(clonedElement, {
          scale: 2, // Higher resolution
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 816, // Match worksheet width
          height: 2112, // Match worksheet height (two pages)
        });

        // Create PDF with letter size dimensions
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'letter' // 8.5" x 11"
        });

        const pageWidth = 612; // Letter width in points (8.5")
        const pageHeight = 792; // Letter height in points (11")
        
        // No extra margins - worksheet already has built-in 1/4 inch borders
        // Calculate scaling to fit worksheet content to full page
        const scaleX = pageWidth / 816; // 816px is worksheet width
        const scaleY = pageHeight / 1056; // 1056px is single page height
        const scale = Math.min(scaleX, scaleY);
        
        const finalWidth = 816 * scale;
        const finalHeight = 1056 * scale;
        
        // Center the content on the page
        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        // Create temporary canvases for each page
        const pageCanvas1 = document.createElement('canvas');
        const pageCanvas2 = document.createElement('canvas');
        pageCanvas1.width = 816 * 2; // Match scale factor from html2canvas
        pageCanvas1.height = 1056 * 2;
        pageCanvas2.width = 816 * 2;
        pageCanvas2.height = 1056 * 2;
        
        const ctx1 = pageCanvas1.getContext('2d');
        const ctx2 = pageCanvas2.getContext('2d');
        
        // Draw first page (top half of original canvas)
        ctx1.drawImage(canvas, 0, 0, canvas.width, canvas.height / 2, 0, 0, pageCanvas1.width, pageCanvas1.height);
        
        // Draw second page (bottom half of original canvas)
        ctx2.drawImage(canvas, 0, canvas.height / 2, canvas.width, canvas.height / 2, 0, 0, pageCanvas2.width, pageCanvas2.height);
        
        // Add pages to PDF
        const imgData1 = pageCanvas1.toDataURL('image/png');
        pdf.addImage(imgData1, 'PNG', x, y, finalWidth, finalHeight);
        
        pdf.addPage();
        const imgData2 = pageCanvas2.toDataURL('image/png');
        pdf.addImage(imgData2, 'PNG', x, y, finalWidth, finalHeight);

        // Generate filename
        const filename = `Unit_${headerInfo.unit}_Lesson_${headerInfo.lesson}_${headerInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

        // Show dialog for save options
        const saveOption = await showPDFSaveDialog();
        
        if (saveOption === 'download') {
          // Download directly
          pdf.save(filename);
        } else if (saveOption === 'drive') {
          // Save to Google Drive
          try {
            const serviceToUse = driveService || driveServiceRef.current;
            if (!serviceToUse) {
              throw new Error('Google Drive service not available. Please log in again.');
            }
            
            console.log('Creating PDF blob for Google Drive...');
            const pdfBlob = pdf.output('blob');
            console.log('PDF blob created, size:', pdfBlob.size);
            
            const folderPath = `Math Practice Creator/Unit ${headerInfo.unit}/Worksheet PDFs`;
            console.log('Saving to folder path:', folderPath);
            
            await serviceToUse.savePDFFile(filename, pdfBlob, folderPath);
            console.log('PDF saved to Google Drive successfully');
            alert('PDF saved to Google Drive successfully!');
          } catch (driveError) {
            console.error('Google Drive save error:', driveError);
            alert(`Failed to save to Google Drive: ${driveError.message}\n\nTrying download instead...`);
            // Fallback to download
            pdf.save(filename);
          }
        }

      } finally {
        // Clean up
        document.body.removeChild(clonedElement);
        document.head.removeChild(style);
      }
    } catch (error) {
      console.error('PDF Export failed:', error);
      alert(`Error creating PDF: ${error.message}. Please try again.`);
    }
  };

  // Show PDF save dialog
  const showPDFSaveDialog = () => {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;
      
      dialog.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
          <h3 style="margin-bottom: 20px;">Save PDF</h3>
          <p style="margin-bottom: 30px;">Choose how to save your worksheet PDF:</p>
          <button id="pdf-download" style="margin: 0 10px; padding: 12px 24px; background: #4a90e2; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
            Download to Computer
          </button>
          <button id="pdf-drive" style="margin: 0 10px; padding: 12px 24px; background: #ff6b35; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
            Save to Google Drive
          </button>
          <br><br>
          <button id="pdf-cancel" style="margin-top: 10px; padding: 8px 16px; background: #ccc; color: #333; border: none; border-radius: 5px; cursor: pointer;">
            Cancel
          </button>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      const cleanup = () => document.body.removeChild(dialog);
      
      document.getElementById('pdf-download').onclick = () => {
        cleanup();
        resolve('download');
      };
      
      document.getElementById('pdf-drive').onclick = () => {
        cleanup();
        resolve('drive');
      };
      
      document.getElementById('pdf-cancel').onclick = () => {
        cleanup();
        resolve('cancel');
      };
      
      // Close on background click
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          cleanup();
          resolve('cancel');
        }
      };
    });
  };

  return (
    <div className="app-content">
      <WorksheetCanvas
        ref={worksheetRef}
        snapToGrid={snapToGrid}
        zoom={zoom}
        onHeaderChange={handleWorksheetHeaderChange}
        onProblemUsed={handleProblemUsed}
        onLoadUsedProblems={handleLoadUsedProblems}
      />
      <AssetManager
        isVisible={isAssetManagerVisible}
        onPlaceTable={(config) => {
          if (worksheetRef.current) {
            worksheetRef.current.handleAddTable(config);
          }
        }}
        onPlaceGraph={(graphData) => {
          if (worksheetRef.current) {
            worksheetRef.current.handleAddGraph(graphData);
          }
        }}
        usedProblems={usedProblems}
        ref={problemSetRef}
        // DocManager props
        isLoggedIn={isLoggedIn}
        userName={userName}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSave={handleSave}
        onLoad={handleLoad}
        driveService={driveService || driveServiceRef.current}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(prev => !prev)}
        currentHeader={currentHeader}
        onHeaderChange={(headerData) => {
          setCurrentHeader(headerData);
          worksheetRef.current?.handleHeaderChange(headerData);
        }}
        onExportPDF={handleExportPDF}
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
