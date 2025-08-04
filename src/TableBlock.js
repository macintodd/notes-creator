// TableBlock.js
import React, { useState, useRef, useEffect } from 'react';
import './TableBlock.css';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

export default function TableBlock({
  id,
  x,
  y,
  width,
  columns,
  rowHeight,
  isSelected,
  onSelect,
  onUpdate,
  onDeselect,
  snapToGrid = true,
  cellValues: initialCellValues = [],
  onCellChange,
  onProblemUsed,
  checkAlignment,
}) {
  const gridSize = 24;
  const [editingCell, setEditingCell] = useState(null);
  const [cellValues, setCellValues] = useState(
    initialCellValues.length === columns
      ? initialCellValues
      : Array(columns).fill('')
  );
  const [currentRowHeight, setCurrentRowHeight] = useState(rowHeight);
  const [hiddenBorders, setHiddenBorders] = useState(new Set()); // Track hidden vertical borders
  const [showBorderMenu, setShowBorderMenu] = useState(null); // { borderIndex, x, y }

  // Sync local cellValues with prop changes (for loading saved data)
  useEffect(() => {
    if (initialCellValues && initialCellValues.length === columns) {
      setCellValues(initialCellValues);
    }
  }, [initialCellValues, columns]);

  // Handle cell edit
  const handleCellClick = (colIdx) => {
    setEditingCell(colIdx);
  };

  const handleCellBlur = (colIdx, e) => {
    const newValues = [...cellValues];
    const editedText = e.target.value;
    const currentValue = cellValues[colIdx];
    
    // If the current value is a problem object, update it properly
    if (typeof currentValue === 'object' && currentValue?.type === 'problem') {
      // Check if the text was completely cleared
      if (!editedText.trim()) {
        // Remove the problem completely
        newValues[colIdx] = '';
      } else {
        // Update the problem text while preserving metadata
        newValues[colIdx] = {
          ...currentValue,
          problemText: editedText
        };
      }
    } else {
      // Regular text update
      newValues[colIdx] = editedText;
    }
    
    setCellValues(newValues);
    setEditingCell(null);
    if (onCellChange) onCellChange(id, newValues);
  };

  const handleCellChange = (colIdx, e) => {
    const newValues = [...cellValues];
    const currentValue = cellValues[colIdx];
    
    // If editing a problem object, update the problemText but preserve metadata
    if (typeof currentValue === 'object' && currentValue?.type === 'problem') {
      newValues[colIdx] = {
        ...currentValue,
        problemText: e.target.value,
        lastModified: new Date().toISOString()
      };
    } else {
      // For legacy text or new text, store as string
      newValues[colIdx] = e.target.value;
    }
    
    setCellValues(newValues);
  };

  // Drag-and-drop for cells
  const handleCellDrop = (colIdx, e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent the event from bubbling to WorksheetCanvas
    
    const data = e.dataTransfer.getData('application/problem');
    
    try {
      const problemData = JSON.parse(data);
      if (problemData.type === 'problems') {
        // Calculate available cells to the right
        const availableCells = columns - colIdx;
        // Slice problems array to only take what will fit
        const problemsToPlace = problemData.content.slice(0, availableCells);
        
        // Create new values array
        const newValues = [...cellValues];
        
        // Place problems in consecutive cells with metadata
        problemsToPlace.forEach((problem, index) => {
          const targetCell = colIdx + index;
          if (targetCell < columns) {
            // Store problem with metadata to maintain reference
            newValues[targetCell] = {
              type: 'problem',
              problemSetName: problemData.problemSetName || 'Unknown Set',
              problemIndex: problemData.originalIndices ? problemData.originalIndices[index] : index,
              problemText: problem,
              timestamp: new Date().toISOString()
            };
            
            // Track used problems
            if (onProblemUsed && problemData.problemSetName && problemData.originalIndices) {
              const originalIndex = problemData.originalIndices[index];
              const problemId = `${problemData.problemSetName}_${originalIndex}`;
              console.log('TableBlock: Marking problem as used:', problemId);
              onProblemUsed(problemId);
            }
          }
        });
        
        // Update state and notify parent
        setCellValues(newValues);
        if (onCellChange) {
          onCellChange(id, newValues);
        }
      }
    } catch (error) {
      console.error('Drop handling error:', error);
    }
  };

  // Make sure handleCellDragOver prevents default
  const handleCellDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Add visual feedback
    e.currentTarget.style.backgroundColor = '#e3f2fd';
  };

  // Add this new handler to remove highlight
  const handleCellDragLeave = (e) => {
    e.currentTarget.style.backgroundColor = '#fafcff';
  };

  // Table drag logic (unchanged)
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const originalYRef = useRef(0);
  const finalYRef = useRef(0); // Track final Y position for alignment
  
  // Height resizing logic
  const resizingRef = useRef(false);
  const startResizeYRef = useRef(0);
  const originalHeightRef = useRef(0);

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('table-drag-handle')) {
      draggingRef.current = true;
      startYRef.current = e.clientY;
      originalYRef.current = y;
      finalYRef.current = y; // Initialize final Y position
      document.addEventListener('mousemove', handleDragging);
      document.addEventListener('mouseup', handleDragEnd);
    } else if (e.target.classList.contains('table-bottom-border')) {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = true;
      startResizeYRef.current = e.clientY;
      originalHeightRef.current = currentRowHeight;
      document.addEventListener('mousemove', handleResizing);
      document.addEventListener('mouseup', handleResizeEnd);
    }
  };

  const handleDragging = (e) => {
    if (!draggingRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    const newY = snapToGrid
      ? Math.round((originalYRef.current + deltaY) / gridSize) * gridSize
      : originalYRef.current + deltaY;
    
    // Store the current Y position for alignment checking
    finalYRef.current = newY;
    
    if (onUpdate) {
      onUpdate(id, { y: newY });
    }
  };

  const handleResizing = (e) => {
    if (!resizingRef.current) return;
    const deltaY = e.clientY - startResizeYRef.current;
    let newHeight = originalHeightRef.current + deltaY;
    
    // Apply minimum height and snap to grid
    newHeight = Math.max(48, newHeight); // Minimum 48px height
    if (snapToGrid) {
      newHeight = Math.round(newHeight / gridSize) * gridSize;
    }
    
    setCurrentRowHeight(newHeight);
    if (onUpdate) {
      onUpdate(id, { rowHeight: newHeight });
    }
  };

  const handleDragEnd = () => {
    draggingRef.current = false;
    
    // Check for table alignment on drag end (only when snap-to-grid is off)
    if (!snapToGrid && checkAlignment && finalYRef.current !== undefined) {
      console.log('Checking alignment for table', id, 'at final Y:', finalYRef.current);
      const alignedY = checkAlignment(id, finalYRef.current);
      if (alignedY !== finalYRef.current && onUpdate) {
        console.log('Applying alignment:', alignedY);
        onUpdate(id, { y: alignedY });
      }
    }
    
    onSelect(id);
    document.removeEventListener('mousemove', handleDragging);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  const handleResizeEnd = () => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleResizing);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  useEffect(() => {
    const cleanup = () => {
      // Cleanup in case component is unmounted mid-drag
      document.removeEventListener('mousemove', handleDragging);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('mousemove', handleResizing);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
    
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array is intentional - these are cleanup functions

  // Border toggle functionality
  const handleBorderClick = (borderIndex, e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowBorderMenu({
      borderIndex,
      x: e.clientX,
      y: e.clientY
    });
  };

  const toggleBorder = (borderIndex) => {
    const newHiddenBorders = new Set(hiddenBorders);
    if (newHiddenBorders.has(borderIndex)) {
      newHiddenBorders.delete(borderIndex);
    } else {
      newHiddenBorders.add(borderIndex);
    }
    setHiddenBorders(newHiddenBorders);
    setShowBorderMenu(null);
  };

  const closeBorderMenu = () => {
    setShowBorderMenu(null);
  };

  // Close border menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showBorderMenu && !e.target.closest('.border-menu')) {
        closeBorderMenu();
      }
    };
    
    if (showBorderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBorderMenu]);

  // Add this new function before the return statement
  const handleTextareaResize = (e) => {
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    // Set the height to match the content
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Render LaTeX or plain text
  function RenderEquation({ value }) {
    if (!value) return <span></span>;
    
    // Handle both new format (problem objects) and legacy format (direct strings)
    let displayText;
    if (typeof value === 'object' && value.type === 'problem') {
      displayText = value.problemText;
    } else {
      displayText = value; // Legacy format
    }
    
    // Split the text by LaTeX delimiters ($$)
    const parts = displayText.split(/(\$\$.*?\$\$)/g);
    
    return (
      <span style={{ 
        display: 'block',
        lineHeight: '1.5', // Reduced from 1.5
        whiteSpace: 'pre-wrap',
        fontSize: '10pt' // Set font size to 10pt
      }}>
        {parts.map((part, index) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            return (
              <span key={index} style={{ 
                display: 'inline-block',
                verticalAlign: 'middle',
                margin: '-0.9em 4px', // Added negative vertical margin to reduce spacing
                transform: 'scale(0.9)',
                transformOrigin: 'center',
                lineHeight: '1' // Tighter line height for equations
              }}>
                <BlockMath math={part.slice(2, -2)} />
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  }

  return (
    <>
      <div
        className={`table-block${isSelected ? ' selected' : ''}`}
        style={{
          position: 'absolute',
          left: x, // use x directly
          top: y,
          width: width,
          minHeight: currentRowHeight,
          background: '#fff',
          border: isSelected ? '2px solid #1976d2' : '1px solid #bbb',
          borderRadius: 6,
          boxShadow: isSelected ? '0 2px 8px #1976d233' : '0 1px 4px #bbb3',
          padding: 0,
          zIndex: isSelected ? 100 : 1, // Normal: 1 (base layer), Selected: 100 (top layer)
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        tabIndex={0}
        onClick={() => onSelect(id)}
      >
        <div className="table-drag-handle" style={{
          width: 24,
          height: currentRowHeight + 20, // Add 20px for cell padding (16px) + cell borders (4px)
          background: '#eee',
          position: 'absolute',
          left: -24,
          top: 0,
          cursor: 'grab',
          borderRight: '1px solid #ccc',
          zIndex: 2, // Always visible relative to its table
        }} title="Drag to move table" />
        
        {/* Bottom resize border */}
        <div 
          className="table-bottom-border"
          style={{
            position: 'absolute',
            bottom: -3,
            left: 0,
            right: 0,
            height: 6,
            cursor: 'ns-resize',
            zIndex: 3,
          }}
          title="Drag to resize table height"
        />
        
        <div
          className="table-content"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            minHeight: currentRowHeight,
            marginLeft: 0, // space for drag handle
          }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="table-cell"
              style={{
                minHeight: currentRowHeight,
                borderRight: colIdx < columns - 1 && !hiddenBorders.has(colIdx) ? '2px solid #000' : 'none',
                borderBottom: '2px solid #000',
                borderLeft: colIdx === 0 ? '2px solid #000' : 'none',
                borderTop: '2px solid #000',
                borderRight: '2px solid #000',
                padding: 8,
                background: '#fafcff',
                position: 'relative',
                cursor: editingCell === colIdx ? 'text' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={(e) => {
                // Only handle cell click if we're not already editing this cell
                if (editingCell !== colIdx) {
                  handleCellClick(colIdx);
                }
                // Always stop propagation to prevent canvas deselection
                e.stopPropagation();
              }}
              onDrop={(e) => handleCellDrop(colIdx, e)}
              onDragOver={handleCellDragOver}
              onDragLeave={handleCellDragLeave}
            >
              {editingCell === colIdx ? (
                <textarea
                  value={
                    typeof cellValues[colIdx] === 'object' && cellValues[colIdx]?.type === 'problem'
                      ? cellValues[colIdx].problemText
                      : cellValues[colIdx] || ''
                  }
                  autoFocus
                  onChange={(e) => {
                    handleCellChange(colIdx, e);
                    handleTextareaResize(e);
                  }}
                  onBlur={(e) => handleCellBlur(colIdx, e)}
                  onClick={(e) => e.stopPropagation()} // Prevent click from bubbling up to canvas
                  onMouseDown={(e) => e.stopPropagation()} // Also prevent mousedown from bubbling up
                  style={{
                    width: '100%',
                    fontSize: '10pt', // Changed from '1em' to '10pt'
                    border: '1px solid #bbb',
                    borderRadius: 3,
                    padding: 4,
                    resize: 'none',
                    overflow: 'hidden',
                    minHeight: '1.5em',
                    height: 'auto',
                  }}
                />
              ) : (
                <RenderEquation value={cellValues[colIdx]} />
              )}
              
              {/* Clickable vertical border (only for cells that have a right border by default) */}
              {colIdx < columns - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: -3,
                    width: 6,
                    height: '100%',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                  onClick={(e) => handleBorderClick(colIdx, e)}
                  title={`Click to ${hiddenBorders.has(colIdx) ? 'show' : 'hide'} border`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Border toggle menu */}
      {showBorderMenu && (
        <div
          className="border-menu"
          style={{
            position: 'fixed',
            left: showBorderMenu.x,
            top: showBorderMenu.y,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: 4,
            padding: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            fontSize: '14px',
          }}
        >
          <button
            onClick={() => toggleBorder(showBorderMenu.borderIndex)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '14px',
            }}
          >
            {hiddenBorders.has(showBorderMenu.borderIndex) ? 'Show Border' : 'Hide Border'}
          </button>
        </div>
      )}
    </>
  );
}