// AssetManager.js
import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import TableTab from './TableTab';
import GraphTab from './GraphTab';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
import 'katex/dist/katex.min.css';
import './AssetManager.css';

const AssetManager = forwardRef(({ 
  onDragStart, 
  onPlaceTable,
  onPlaceGraph,
  onPlaceText,
  usedProblems,
  // DocManager props
  isLoggedIn,
  userName,
  onLogin,
  onLogout,
  onSave,
  onLoad,
  driveService,
  snapToGrid,
  onToggleSnap,
  currentHeader,
  onHeaderChange,
  // PDF export props
  onExportPDF
}, ref) => {
  const [activeTab, setActiveTab] = useState('Text');
  const [problemSets, setProblemSets] = useState(new Map());
  const [problemSetsJson, setProblemSetsJson] = useState(new Map()); // Store JSON for each set
  const [currentSet, setCurrentSet] = useState(null);
  const [selectedProblems, setSelectedProblems] = useState(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [jsonText, setJsonText] = useState(''); // Current JSON being edited
  
  // DocManager state
  const [unitNumber, setUnitNumber] = useState('1A');
  const [lessonNumber, setLessonNumber] = useState('0');
  const [lessonTitle, setLessonTitle] = useState('Lesson Title');
  const [isSaving, setIsSaving] = useState(false);
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // PDF Export functionality
  const handleExportPDF = async () => {
    if (!onExportPDF) {
      alert('PDF export is not available');
      return;
    }
    
    setIsExportingPDF(true);
    try {
      await onExportPDF({
        unit: unitNumber,
        lesson: lessonNumber,
        title: lessonTitle
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error creating PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Update local state when currentHeader prop changes (when document is loaded)
  // Only update if user is not currently editing to avoid overriding user input
  useEffect(() => {
    if (currentHeader && !isUserEditing) {
      setUnitNumber(currentHeader.unit || '1A');
      setLessonNumber(currentHeader.lesson || '0');
      setLessonTitle(currentHeader.title || 'Lesson Title');
    }
  }, [currentHeader, isUserEditing]);

  // Helper function to notify parent and handle user input
  const handleHeaderFieldChange = (field, value) => {
    setIsUserEditing(true);
    
    // Update local state
    switch (field) {
      case 'unit':
        setUnitNumber(value);
        break;
      case 'lesson':
        setLessonNumber(value);
        break;
      case 'title':
        setLessonTitle(value);
        break;
      default:
        // No action needed for unknown fields
        break;
    }
    
    // Create updated header object
    const updatedHeader = {
      unit: field === 'unit' ? value : unitNumber,
      lesson: field === 'lesson' ? value : lessonNumber,
      title: field === 'title' ? value : lessonTitle
    };
    
    // Notify parent immediately
    if (onHeaderChange) {
      onHeaderChange(updatedHeader);
    }
    
    // Clear editing flag after a brief delay
    setTimeout(() => setIsUserEditing(false), 100);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Construct filename from header fields (matching App.js format)
      const fileName = `U${unitNumber}L${lessonNumber}${lessonTitle.replace(/\s+/g, '')}`;
      
      // Call the parent save handler with just the filename
      await onSave(fileName);
      
      // Show saved state briefly
      setTimeout(() => {
        setIsSaving(false);
      }, 1500);
    } catch (error) {
      console.error('Save failed:', error);
      setIsSaving(false);
    }
  };

  const textPresets = [
    {
      id: 'text',
      label: 'Text',
      style: 'text',
      preview: 'Text',
      fontSize: '10pt',
      fontWeight: 'normal',
      fontStyle: 'normal'
    },
    {
      id: 'directions',
      label: 'Directions',
      style: 'directions',
      preview: 'Directions',
      fontSize: '10pt',
      fontWeight: 'bold',
      fontStyle: 'italic'
    },
    {
      id: 'emphasis',
      label: 'Emphasis',
      style: 'emphasis',
      preview: 'Emphasis',
      fontSize: '12pt',
      fontWeight: 'bold',
      fontStyle: 'normal'
    },
    {
      id: 'hints',
      label: 'Hints',
      style: 'hints',
      preview: 'Hints',
      fontSize: '8pt',
      fontWeight: 'normal',
      fontStyle: 'normal'
    },
    {
      id: 'target-skill',
      label: 'Target Skill(s):',
      style: 'target-skill',
      preview: 'Target Skill(s):',
      fontSize: '10pt',
      fontWeight: 'bold',
      fontStyle: 'normal'
    }
  ];

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    try {
      const pastedData = JSON.parse(pastedText);
      const [[setName, problems]] = Object.entries(pastedData);
      
      // Update both the problem sets and store the JSON
      setProblemSets(prev => new Map(prev).set(setName, problems));
      setProblemSetsJson(prev => new Map(prev).set(setName, pastedText));
      setCurrentSet(setName);
      setJsonText(pastedText); // Show the pasted JSON in the textarea
      setSelectedProblems(new Set()); // Clear selection when new set is pasted
      setLastSelectedIndex(null);
    } catch (error) {
      console.error('Invalid problem set format:', error);
    }
  };

  const handleJsonChange = (e) => {
    const newJsonText = e.target.value;
    setJsonText(newJsonText);
    
    // Try to parse and update the problem list in real-time
    if (newJsonText.trim()) {
      try {
        const parsedData = JSON.parse(newJsonText);
        const [[setName, problems]] = Object.entries(parsedData);
        
        // Update the problem set if valid JSON
        setProblemSets(prev => new Map(prev).set(setName, problems));
        setProblemSetsJson(prev => new Map(prev).set(setName, newJsonText));
        
        // If the set name changed, update current set
        if (setName !== currentSet) {
          setCurrentSet(setName);
        }
        
        setSelectedProblems(new Set()); // Clear selection when JSON changes
        setLastSelectedIndex(null);
      } catch (error) {
        // Invalid JSON - just update the text, don't update problem list
        // This allows users to edit while typing without breaking
        console.log('JSON parsing in progress...', error.message);
      }
    }
  };

  const handleSetChange = (setName) => {
    setCurrentSet(setName);
    setSelectedProblems(new Set()); // Clear selection when switching sets
    setLastSelectedIndex(null);
    
    // Load the JSON for this set into the textarea
    const setJson = problemSetsJson.get(setName) || '';
    setJsonText(setJson);
  };

  const handleProblemDragStart = (e, problem, index) => {
    // If the dragged item isn't selected, select only it
    let actualSelectedProblems;
    if (!selectedProblems.has(index)) {
      actualSelectedProblems = new Set([index]);
      setSelectedProblems(actualSelectedProblems);
    } else {
      actualSelectedProblems = selectedProblems;
    }
    
    // Get all selected problems
    const currentProblems = problemSets.get(currentSet);
    const selectedIndices = Array.from(actualSelectedProblems).sort((a, b) => a - b);
    const selectedProblemData = selectedIndices.map(idx => currentProblems[idx]);
    
    // Create custom drag preview showing only selected problems
    const dragPreview = document.createElement('div');
    dragPreview.className = 'problem-drag-preview';
    dragPreview.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      background: var(--fall-cream);
      border: 2px solid var(--fall-burnt-orange);
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(62, 39, 35, 0.3);
      font-size: 14px;
      font-weight: bold;
      color: var(--fall-burnt-orange);
      z-index: 10000;
      pointer-events: none;
    `;
    
    if (selectedProblemData.length === 1) {
      dragPreview.textContent = 'Dragging 1 problem';
    } else {
      dragPreview.textContent = `Dragging ${selectedProblemData.length} problems`;
    }
    
    document.body.appendChild(dragPreview);
    
    // Set the custom drag image
    e.dataTransfer.setDragImage(dragPreview, 50, 20);
    
    // Clean up the preview element after a short delay
    setTimeout(() => {
      if (document.body.contains(dragPreview)) {
        document.body.removeChild(dragPreview);
      }
    }, 100);
    
    e.dataTransfer.setData('application/problem', JSON.stringify({
      type: 'problems',
      content: selectedProblemData,
      problemSetName: currentSet,
      originalIndices: selectedIndices // Include original indices for reference
    }));
  };

  const handleProblemClick = (index, event) => {
    const isCmd = event.metaKey || event.ctrlKey;
    const isShift = event.shiftKey;
    
    if (isShift && lastSelectedIndex !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelection = new Set(selectedProblems);
      
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
      setSelectedProblems(newSelection);
    } else if (isCmd) {
      // Toggle selection
      const newSelection = new Set(selectedProblems);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      setSelectedProblems(newSelection);
      setLastSelectedIndex(index);
    } else {
      // Single selection
      setSelectedProblems(new Set([index]));
      setLastSelectedIndex(index);
    }
  };

  const handleLoadProblemSets = async () => {
    if (!driveService || !isLoggedIn) {
      alert('Please sign in with Google to load problem sets');
      return;
    }

    try {
      // Use Google Drive picker to let user select a file
      const selectedFile = await driveService.openGoogleFilePicker();
      if (!selectedFile) {
        return; // User cancelled
      }

      // Download the selected file content
      const contentResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFile.id}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${driveService.accessToken}`
          }
        }
      );

      if (!contentResponse.ok) {
        throw new Error('Failed to download file');
      }

      const fileContent = await contentResponse.text();
      console.log('Raw file content length:', fileContent.length);
      
      // Try to process like paste functionality - handle the content as raw JSON text
      try {
        // First, try to parse as JSON to see what format we have
        let parsedData = JSON.parse(fileContent);
        console.log('First parse successful');
        console.log('First parsed data type:', typeof parsedData);
        
        // Check if we have double-encoded JSON (string containing JSON)
        if (typeof parsedData === 'string') {
          console.log('Detected double-encoded JSON, parsing again...');
          try {
            parsedData = JSON.parse(parsedData);
            console.log('Second parse successful');
            console.log('Second parsed data type:', typeof parsedData);
          } catch (secondParseError) {
            console.log('Second parse failed, using first result');
          }
        }
        
        console.log('Final parsed data type:', typeof parsedData);
        console.log('Is parsedData an object?', typeof parsedData === 'object' && parsedData !== null);
        
        // Make sure we have an object, not a string
        if (typeof parsedData !== 'object' || parsedData === null) {
          alert('File does not contain valid JSON object');
          return;
        }
        
        let finalJson;
        
        // Check if this is the new format with metadata (version 1.0+)
        if (parsedData.version && parsedData.metadata && parsedData.problems) {
          console.log('Detected new format with version:', parsedData.version);
          console.log('Problems array length:', parsedData.problems.length);
          console.log('Is problems an array?', Array.isArray(parsedData.problems));
          
          // Convert new format to old format expected by AssetManager
          const setName = parsedData.metadata.title || selectedFile.name.replace(/\.(json|txt)$/, '') || 'LoadedSet';
          console.log('Set name will be:', setName);
          
          finalJson = {
            [setName]: parsedData.problems
          };
          console.log('Final JSON created with keys:', Object.keys(finalJson));
        } else {
          // Already in the expected format or other format - use as is
          finalJson = parsedData;
          console.log('Using data as-is with keys:', Object.keys(finalJson));
        }
        
        // Validate the final structure
        console.log('Validating final JSON...');
        const finalKeys = Object.keys(finalJson);
        console.log('Final JSON keys:', finalKeys);
        
        let validSets = 0;
        for (const setName of finalKeys) {
          const problems = finalJson[setName];
          console.log(`Checking set "${setName}":`, Array.isArray(problems) ? `Array with ${problems.length} items` : typeof problems);
          if (Array.isArray(problems)) {
            validSets++;
            console.log(`Set "${setName}" is valid with ${problems.length} problems`);
          } else {
            console.log(`Set "${setName}" is INVALID - not an array, type:`, typeof problems);
          }
        }
        
        if (validSets === 0) {
          console.error('No valid problem sets found');
          alert('No valid problem sets found in the file');
          return;
        }
        
        // Now process like the paste functionality
        const newSets = new Map();
        const newJsonSets = new Map();
        
        for (const setName of finalKeys) {
          const problems = finalJson[setName];
          if (Array.isArray(problems)) {
            newSets.set(setName, problems);
            newJsonSets.set(setName, JSON.stringify({[setName]: problems}, null, 2));
            console.log(`Added set "${setName}" with ${problems.length} problems`);
          }
        }
        
        // Update state like paste does
        setProblemSets(prev => {
          const updated = new Map(prev);
          newSets.forEach((problems, setName) => {
            updated.set(setName, problems);
          });
          return updated;
        });
        
        setProblemSetsJson(prev => {
          const updated = new Map(prev);
          newJsonSets.forEach((json, setName) => {
            updated.set(setName, json);
          });
          return updated;
        });
        
        // Set the first loaded set as current
        const firstSetName = Array.from(newSets.keys())[0];
        setCurrentSet(firstSetName);
        setJsonText(newJsonSets.get(firstSetName));
        setSelectedProblems(new Set());
        
        console.log(`Successfully loaded ${newSets.size} problem set(s)`);
        
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        alert('Selected file does not contain valid JSON');
        return;
      }
    } catch (error) {
      console.error('Error loading problem sets:', error);
      alert(`Failed to load problem sets: ${error.message}`);
    }
  };

  const RenderEquation = ({ equation }) => {
    // Handle pure LaTeX (starts and ends with $$)
    if (equation.startsWith('$$') && equation.endsWith('$$')) {
      return <BlockMath math={equation.slice(2, -2)} />;
    }
    
    // Handle mixed content (text with embedded $$...$$)
    const parts = [];
    let lastIndex = 0;
    let partKey = 0;
    
    // Find all $$....$$ patterns
    const latexPattern = /\$\$(.*?)\$\$/g;
    let match;
    
    while ((match = latexPattern.exec(equation)) !== null) {
      // Add text before the LaTeX
      if (match.index > lastIndex) {
        const textBefore = equation.slice(lastIndex, match.index);
        parts.push(<span key={partKey++}>{textBefore}</span>);
      }
      
      // Add the LaTeX part
      const latexContent = match[1];
      parts.push(<InlineMath key={partKey++} math={latexContent} />);
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last LaTeX
    if (lastIndex < equation.length) {
      const textAfter = equation.slice(lastIndex);
      parts.push(<span key={partKey++}>{textAfter}</span>);
    }
    
    // If no LaTeX was found, just return the text
    if (parts.length === 0) {
      return <span>{equation}</span>;
    }
    
    return <span>{parts}</span>;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Text':
        return (
          <div className="text-presets">
            {textPresets.map(preset => (
              <div
                key={preset.id}
                className={`text-preset-box ${preset.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('📝 Text preset clicked:', preset.label);
                  if (onPlaceText) {
                    onPlaceText(preset);
                  } else {
                    console.error('onPlaceText is not defined!');
                  }
                }}
                style={{
                  fontSize: preset.fontSize,
                  fontWeight: preset.fontWeight,
                  fontStyle: preset.fontStyle,
                  cursor: 'pointer',
                  pointerEvents: 'auto'
                }}
              >
                <div className="text-preset-label">{preset.label}</div>
                <div className="text-preset-preview">{preset.preview}</div>
              </div>
            ))}
          </div>
        );
      case 'Problems':
        return (
          <div className="problem-content">
            <textarea 
              className="paste-area"
              placeholder="Paste or edit problem set JSON here..."
              value={jsonText}
              onChange={handleJsonChange}
              onPaste={handlePaste}
            />
            <div className="problem-instructions">
              <small>
                Paste JSON or edit above • Click to select • Shift+click for range • Cmd+click to toggle
              </small>
            </div>
            {problemSets.size > 0 && (
              <select 
                className="set-selector"
                value={currentSet || ''} 
                onChange={(e) => handleSetChange(e.target.value)}
              >
                <option value="">Select a Set</option>
                {Array.from(problemSets.keys()).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
            {currentSet && problemSets.has(currentSet) && (
              <>
                {selectedProblems.size > 0 && (
                  <div className="selection-info">
                    {selectedProblems.size} problem{selectedProblems.size !== 1 ? 's' : ''} selected
                  </div>
                )}
                <div className="problem-list">
                  {problemSets.get(currentSet).map((problem, index) => {
                    const problemId = `${currentSet}_${index}`;
                    const isUsed = usedProblems && usedProblems.includes(problemId);
                    return (
                      <div
                        key={index}
                        className={`problem-item ${selectedProblems.has(index) ? 'selected' : ''} ${isUsed ? 'used' : ''}`}
                        draggable
                        onDragStart={(e) => handleProblemDragStart(e, problem, index)}
                        onClick={(e) => handleProblemClick(index, e)}
                      >
                        <RenderEquation equation={problem} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {isLoggedIn && (
              <div className="load-problems-section">
                <button 
                  className="load-problems-button"
                  onClick={handleLoadProblemSets}
                  title="Load problem sets from Google Drive"
                >
                  Load Problems
                </button>
              </div>
            )}
          </div>
        );
      case 'Images':
        return <div className="image-content">Image content here</div>;
      case 'Graphs':
        return <GraphTab onPlaceGraph={onPlaceGraph} />;
      case 'Tables':
        return <TableTab onPlaceTable={onPlaceTable} />;
      case 'File':
        return (
          <div className="file-content">
            {/* Login Section */}
            <div className="file-section">
              {isLoggedIn ? (
                <div className="user-info">
                  <div>✓ {userName}</div>
                  <button onClick={onLogout} className="logout-button">
                    Sign Out
                  </button>
                </div>
              ) : (
                <button onClick={onLogin} className="login-button">
                  Sign in with Google
                </button>
              )}
            </div>

            {/* Header Section */}
            <div className="file-section">
              <h4>Document Info</h4>
              <div className="input-group">
                <label>Unit:</label>
                <select
                  value={unitNumber}
                  onChange={(e) => handleHeaderFieldChange('unit', e.target.value)}
                >
                  <option value="1A">1A</option>
                  <option value="1B">1B</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4A">4A</option>
                  <option value="4B">4B</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                </select>
              </div>
              <div className="input-group">
                <label>Lesson:</label>
                <input
                  type="number"
                  value={lessonNumber}
                  onChange={(e) => handleHeaderFieldChange('lesson', e.target.value)}
                  min="0"
                />
              </div>
              <div className="input-group">
                <label>Title:</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => handleHeaderFieldChange('title', e.target.value)}
                  placeholder="Lesson Title"
                />
              </div>
            </div>

            {/* Save/Load Section */}
            <div className="file-section">
              <h4>File Operations</h4>
              <button 
                onClick={handleSave}
                className={`save-button ${isSaving ? 'saved' : ''}`}
                disabled={isSaving || !isLoggedIn}
              >
                {isSaving ? 'Saved!' : 'Save Worksheet'}
              </button>
              <button 
                onClick={onLoad}
                disabled={!isLoggedIn}
              >
                Load Worksheet
              </button>
              <button 
                onClick={handleExportPDF}
                className={`export-pdf-button ${isExportingPDF ? 'exporting' : ''}`}
                disabled={isExportingPDF}
              >
                {isExportingPDF ? 'Creating PDF...' : 'Export PDF'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    exportProblemSets: () => {
      // Convert Map to plain object for JSON serialization
      const problemSetsObj = {};
      for (const [setName, problems] of problemSets) {
        problemSetsObj[setName] = problems;
      }
      return problemSetsObj;
    },
    
    loadProblemSets: (problemSetsData) => {
      // Load problem sets from data (for loading worksheets)
      setProblemSets(new Map(Object.entries(problemSetsData)));
      
      // Also update JSON text state
      const newJsonMap = new Map();
      for (const [setName, problems] of Object.entries(problemSetsData)) {
        newJsonMap.set(setName, JSON.stringify({ [setName]: problems }, null, 2));
      }
      setProblemSetsJson(newJsonMap);
      
      // If there's a current set, update the JSON text
      if (currentSet && problemSetsData[currentSet]) {
        setJsonText(JSON.stringify({ [currentSet]: problemSetsData[currentSet] }, null, 2));
      }
    },

    // Legacy methods for compatibility
    saveProblemSetsToFile: async () => {
      // This can be implemented later for backward compatibility if needed
      console.log('Legacy saveProblemSetsToFile called - this should be replaced with new save system');
    },
    
    loadProblemSetsFromFile: async () => {
      // This can be implemented later for backward compatibility if needed  
      console.log('Legacy loadProblemSetsFromFile called - this should be replaced with new load system');
    }
  }));

  return (
    <div className="asset-manager">
      {/* Snap to Grid Toggle - Always Visible */}
      <div className="snap-toggle-section">
        <label className="snap-toggle">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={onToggleSnap}
          />
          STG (Snap to Grid)
        </label>
      </div>
      
      <div className="asset-tabs">
        {['Text', 'Images', 'Graphs', 'Tables', 'Problems', 'File'].map(tab => (
          <button
            key={tab}
            className={`asset-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="asset-content">
        {renderContent()}
      </div>
    </div>
  );
});

export default AssetManager;