import React, { useState, useEffect } from 'react';
import './ProblemSetTab.css';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

export default function ProblemSetTab({ onDragProblem, driveService }) {
  const [problemSets, setProblemSets] = useState(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem('problemSets');
    return saved ? new Map(JSON.parse(saved)) : new Map();
  });
  
  const [currentSet, setCurrentSet] = useState(null);
  const [editableJson, setEditableJson] = useState('');
  const [selectedProblems, setSelectedProblems] = useState(new Set());
  const [lastSelected, setLastSelected] = useState(null);

  // Save to localStorage whenever problemSets changes
  useEffect(() => {
    localStorage.setItem('problemSets', 
      JSON.stringify(Array.from(problemSets.entries()))
    );
  }, [problemSets]);

  // Add to driveService save functionality
  const saveProblemSetsToFile = async () => {
    if (!driveService) return;
    
    try {
      const problemSetsData = {
        version: '1.0',
        sets: Object.fromEntries(problemSets),
        lastModified: new Date().toISOString()
      };

      await driveService.saveFile({
        name: 'worksheet_problem_sets.json',
        content: JSON.stringify(problemSetsData, null, 2),
        mimeType: 'application/json'
      });
    } catch (error) {
      console.error('Failed to save problem sets:', error);
    }
  };

  // Load from drive when worksheet is opened
  const loadProblemSetsFromFile = async () => {
    if (!driveService) return;
    
    try {
      const response = await driveService.getFile('worksheet_problem_sets.json');
      if (response) {
        const data = JSON.parse(response.content);
        setProblemSets(new Map(Object.entries(data.sets)));
      }
    } catch (error) {
      console.error('Failed to load problem sets:', error);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    try {
      const pastedData = JSON.parse(pastedText);
      const [[setName, problems]] = Object.entries(pastedData);
      
      setProblemSets(prev => new Map(prev).set(setName, problems));
      setCurrentSet(setName);
      setEditableJson(JSON.stringify({ [setName]: problems }, null, 2));
    } catch (error) {
      console.error('Invalid problem set format:', error);
    }
  };

  const handleJsonEdit = (e) => {
    const newJson = e.target.value;
    setEditableJson(newJson);
    
    try {
      const parsedData = JSON.parse(newJson);
      const [[setName, problems]] = Object.entries(parsedData);
      setProblemSets(prev => new Map(prev).set(setName, problems));
    } catch (error) {
      // Ignore parse errors during editing
    }
  };

  const handleProblemClick = (index, event) => {
    if (event.shiftKey && lastSelected !== null) {
      // Shift+click for range selection
      const start = Math.min(lastSelected, index);
      const end = Math.max(lastSelected, index);
      const newSelected = new Set(selectedProblems);
      
      for (let i = start; i <= end; i++) {
        newSelected.add(i);
      }
      setSelectedProblems(newSelected);
    } else if (event.metaKey) {  // Use metaKey for Cmd on Mac
      // Cmd+click for individual toggle
      const newSelected = new Set(selectedProblems);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedProblems(newSelected);
    } else {
      // Normal click
      setSelectedProblems(new Set([index]));
    }
    setLastSelected(index);
  };

  const handleDragStart = (e, problem) => {
    let dragData;
    
    if (selectedProblems.size > 0) {
      // Get all selected problems in order
      const problems = Array.from(selectedProblems)
        .sort((a, b) => a - b)
        .map(index => problemSets.get(currentSet)[index]);
        
      dragData = {
        type: 'problems',
        content: problems
      };
    } else {
      // Single problem drag
      dragData = {
        type: 'problems',
        content: [problem]
      };
    }
    
    e.dataTransfer.setData('application/problem', JSON.stringify(dragData));
    
    // Create drag preview showing number of problems
    const dragPreview = document.createElement('div');
    dragPreview.className = 'problem-drag-preview';
    dragPreview.innerHTML = `${dragData.content.length} problem${dragData.content.length > 1 ? 's' : ''}`;
    document.body.appendChild(dragPreview);
    
    e.dataTransfer.setDragImage(dragPreview, 0, 0);
    
    requestAnimationFrame(() => {
      document.body.removeChild(dragPreview);
    });
  };

  return (
    <div className="problem-set-tab">
      <textarea 
        className="paste-area"
        placeholder="Paste problem set JSON here..."
        onPaste={handlePaste}
        value={currentSet ? editableJson : ''}
        onChange={handleJsonEdit}
        spellCheck="false"
      />
      
      {problemSets.size > 0 && (
        <select 
          className="set-selector"
          value={currentSet || ''} 
          onChange={(e) => {
            const newSet = e.target.value;
            setCurrentSet(newSet);
            if (newSet) {
              setEditableJson(JSON.stringify(
                { [newSet]: problemSets.get(newSet) }, 
                null, 
                2
              ));
            }
          }}
        >
          <option value="">Select a Set</option>
          {Array.from(problemSets.keys()).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      )}

      {currentSet && (
        <div className="problem-list">
          {problemSets.get(currentSet).map((problem, index) => (
            <div
              key={index}
              className={`problem-item ${selectedProblems.has(index) ? 'selected' : ''}`}
              draggable
              onClick={(e) => handleProblemClick(index, e)}
              onDragStart={(e) => handleDragStart(e, problem)}
            >
              <RenderEquation equation={problem} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RenderEquation({ equation }) {
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
}