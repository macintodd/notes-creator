import React, { useState, useRef, useEffect } from 'react';
import './VerticalGuideLine.css';

export default function VerticalGuideLine({ 
  initialX = 200, // 1.5 inches from left (1.5 * 72 = 108px)
  onPositionChange,
  canvasHeight = 1584 // Two page height
}) {
  const [x, setX] = useState(147);
  const [isLocked, setIsLocked] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isSelected, setIsSelected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [topY, setTopY] = useState(60); // Start below header
  const [bottomY, setBottomY] = useState(1000); // End 1/4 inch from bottom of first page
  const [dragMode, setDragMode] = useState(null); // 'line', 'top', 'bottom'
  
  // Second line for page 2
  const [x2, setX2] = useState(initialX);
  const [isLocked2, setIsLocked2] = useState(true);
  const [isSelected2, setIsSelected2] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const [topY2, setTopY2] = useState(1080); // Start of page 2 (792 + 60)
  const [bottomY2, setBottomY2] = useState(2080); // End of page 2 (792 * 2 = 1584, but 1792 for 1/4 inch from bottom)
  const [dragMode2, setDragMode2] = useState(null);
  
  const lineRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startTopY: 0, startBottomY: 0 });
  const dragModeRef = useRef(null);
  const isDraggingRef = useRef(false);
  
  // Refs for second line
  const lineRef2 = useRef(null);
  const dragStartRef2 = useRef({ x: 0, y: 0, startX: 0, startTopY: 0, startBottomY: 0 });
  const dragModeRef2 = useRef(null);
  const isDraggingRef2 = useRef(false);

  // Notify parent of position changes
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange(x);
    }
  }, [x, onPositionChange]);

  // Mouse handlers for first line
  const handleMouseDown = (e, mode = 'line') => {
    // Only prevent dragging the line if it's locked, but allow clicking for selection
    if (isLocked && mode === 'line') {
      e.preventDefault();
      e.stopPropagation();
      setIsSelected(true);
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('VerticalGuideLine mouseDown:', mode, 'isLocked:', isLocked);
    console.log('Setting dragMode to:', mode);
    
    // Set drag mode BEFORE setting isDragging to ensure state is consistent
    setDragMode(mode);
    dragModeRef.current = mode; // Also store in ref for immediate access
    setIsDragging(true);
    isDraggingRef.current = true; // Also store in ref for immediate access
    setIsSelected(true); // Select when starting to drag
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: x,
      startTopY: topY,
      startBottomY: bottomY
    };
    
    console.log('Adding global mouse listeners, dragMode:', mode);
    
    // Use capture phase to ensure we get the events first
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
  };

  const handleMouseMove = (e) => {
    const currentDragMode = dragModeRef.current || dragMode;
    const currentIsDragging = isDraggingRef.current || isDragging;
    
    if (!currentIsDragging || !currentDragMode) {
      console.log('Mouse move but not dragging:', { isDragging, currentIsDragging, dragMode, currentDragMode });
      return;
    }
    
    e.preventDefault(); // Prevent any default behavior during drag
    e.stopPropagation(); // Stop event from bubbling
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    console.log('VerticalGuideLine drag:', { dragMode: currentDragMode, deltaX, deltaY });
    
    if (currentDragMode === 'line') {
      // Move the entire line horizontally only
      const newX = Math.max(24, Math.min(600, dragStartRef.current.startX + deltaX));
      console.log('Moving line to X:', newX);
      setX(newX);
    } else if (currentDragMode === 'top') {
      // Adjust top handle
      const newTopY = Math.max(60, Math.min(bottomY - 50, dragStartRef.current.startTopY + deltaY));
      setTopY(newTopY);
    } else if (currentDragMode === 'bottom') {
      // Adjust bottom handle
      const newBottomY = Math.max(topY + 50, Math.min(canvasHeight - 60, dragStartRef.current.startBottomY + deltaY));
      setBottomY(newBottomY);
    }
  };

  const handleMouseUp = (e) => {
    console.log('VerticalGuideLine mouseUp, was dragging:', isDragging);
    
    if (isDraggingRef.current || isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsDragging(false);
    isDraggingRef.current = false; // Clear the ref too
    setDragMode(null);
    dragModeRef.current = null; // Clear the ref too
    
    // Clean up event listeners (use capture phase to match how they were added)
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('mouseup', handleMouseUp, true);
    
    console.log('Removed global mouse listeners');
  };

  // Mouse handlers for second line
  const handleMouseDown2 = (e, mode = 'line') => {
    // Only prevent dragging the line if it's locked, but allow clicking for selection
    if (isLocked2 && mode === 'line') {
      e.preventDefault();
      e.stopPropagation();
      setIsSelected2(true);
      setIsSelected(false); // Deselect first line
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('VerticalGuideLine2 mouseDown:', mode, 'isLocked:', isLocked2);
    console.log('Setting dragMode2 to:', mode);
    
    // Set drag mode BEFORE setting isDragging to ensure state is consistent
    setDragMode2(mode);
    dragModeRef2.current = mode; // Also store in ref for immediate access
    setIsDragging2(true);
    isDraggingRef2.current = true; // Also store in ref for immediate access
    setIsSelected2(true); // Select when starting to drag
    setIsSelected(false); // Deselect first line
    
    dragStartRef2.current = {
      x: e.clientX,
      y: e.clientY,
      startX: x2,
      startTopY: topY2,
      startBottomY: bottomY2
    };
    
    console.log('Adding global mouse listeners for line 2, dragMode:', mode);
    
    // Use capture phase to ensure we get the events first
    document.addEventListener('mousemove', handleMouseMove2, true);
    document.addEventListener('mouseup', handleMouseUp2, true);
  };

  const handleMouseMove2 = (e) => {
    const currentDragMode = dragModeRef2.current || dragMode2;
    const currentIsDragging = isDraggingRef2.current || isDragging2;
    
    if (!currentIsDragging || !currentDragMode) {
      console.log('Mouse move but not dragging line 2:', { isDragging: isDragging2, currentIsDragging, dragMode: dragMode2, currentDragMode });
      return;
    }
    
    e.preventDefault(); // Prevent any default behavior during drag
    e.stopPropagation(); // Stop event from bubbling
    
    const deltaX = e.clientX - dragStartRef2.current.x;
    const deltaY = e.clientY - dragStartRef2.current.y;
    
    console.log('VerticalGuideLine2 drag:', { dragMode: currentDragMode, deltaX, deltaY });
    
    if (currentDragMode === 'line') {
      // Move the entire line horizontally only
      const newX = Math.max(24, Math.min(600, dragStartRef2.current.startX + deltaX));
      console.log('Moving line 2 to X:', newX);
      setX2(newX);
    } else if (currentDragMode === 'top') {
      // Adjust top handle
      const newTopY = Math.max(852, Math.min(bottomY2 - 50, dragStartRef2.current.startTopY + deltaY));
      setTopY2(newTopY);
    } else if (currentDragMode === 'bottom') {
      // Adjust bottom handle
      const newBottomY = Math.max(topY2 + 50, Math.min(canvasHeight - 60, dragStartRef2.current.startBottomY + deltaY));
      setBottomY2(newBottomY);
    }
  };

  const handleMouseUp2 = (e) => {
    console.log('VerticalGuideLine2 mouseUp, was dragging:', isDragging2);
    
    if (isDraggingRef2.current || isDragging2) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsDragging2(false);
    isDraggingRef2.current = false; // Clear the ref too
    setDragMode2(null);
    dragModeRef2.current = null; // Clear the ref too
    
    // Clean up event listeners (use capture phase to match how they were added)
    document.removeEventListener('mousemove', handleMouseMove2, true);
    document.removeEventListener('mouseup', handleMouseUp2, true);
    
    console.log('Removed global mouse listeners for line 2');
  };

  const handleLineClick = (e) => {
    e.stopPropagation();
    // Don't override the mouseDown selection logic
    if (!isDragging) {
      setIsSelected(true);
      setIsSelected2(false); // Deselect second line
    }
  };

  const handleLineClick2 = (e) => {
    e.stopPropagation();
    // Don't override the mouseDown selection logic
    if (!isDragging2) {
      setIsSelected2(true);
      setIsSelected(false); // Deselect first line
    }
  };

  const toggleLock = (e) => {
    e.stopPropagation(); // Prevent the click from bubbling up and deselecting
    setIsLocked(!isLocked);
  };

  const toggleLock2 = (e) => {
    e.stopPropagation(); // Prevent the click from bubbling up and deselecting
    setIsLocked2(!isLocked2);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    setIsSelected(false);
  };

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = () => {
      setIsSelected(false);
      setIsSelected2(false);
    };
    
    if (isSelected || isSelected2) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isSelected, isSelected2]);

  if (!isVisible) return null;

  const lineHeight = bottomY - topY;
  const lineHeight2 = bottomY2 - topY2;

  return (
    <>
      {/* The first vertical line */}
      <div
        ref={lineRef}
        className={`vertical-guide-line ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : 'unlocked'}`}
        style={{
          position: 'absolute',
          left: x,
          top: topY,
          width: '0px',
          height: lineHeight,
          borderLeft: `1.5px solid ${isSelected ? '#d2691e' : '#000'}`,
          cursor: isLocked ? 'pointer' : 'ew-resize',
          zIndex: 10,
          minWidth: '4px' // Make it easier to click
        }}
        onClick={handleLineClick}
        onMouseDown={(e) => handleMouseDown(e, 'line')}
      />

      {/* The second vertical line (page 2) */}
      <div
        ref={lineRef2}
        className={`vertical-guide-line ${isSelected2 ? 'selected' : ''} ${isLocked2 ? 'locked' : 'unlocked'}`}
        style={{
          position: 'absolute',
          left: x2,
          top: topY2,
          width: '0px',
          height: lineHeight2,
          borderLeft: `1.5px solid ${isSelected2 ? '#d2691e' : '#000'}`,
          cursor: isLocked2 ? 'pointer' : 'ew-resize',
          zIndex: 10,
          minWidth: '4px' // Make it easier to click
        }}
        onClick={handleLineClick2}
        onMouseDown={(e) => handleMouseDown2(e, 'line')}
      />
      
      {/* Top handle */}
      {isSelected && !isLocked && (
        <div
          className="guide-line-handle top-handle"
          style={{
            position: 'absolute',
            left: x - 4,
            top: topY - 4,
            width: '10px',
            height: '8px',
            backgroundColor: '#d2691e',
            cursor: 'ns-resize',
            zIndex: 15,
            border: '1px solid #fff'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'top')}
        />
      )}
      
      {/* Bottom handle */}
      {isSelected && !isLocked && (
        <div
          className="guide-line-handle bottom-handle"
          style={{
            position: 'absolute',
            left: x - 4,
            top: bottomY - 4,
            width: '10px',
            height: '8px',
            backgroundColor: '#d2691e',
            cursor: 'ns-resize',
            zIndex: 15,
            border: '1px solid #fff'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'bottom')}
        />
      )}

      {/* Top handle for second line */}
      {isSelected2 && !isLocked2 && (
        <div
          className="guide-line-handle top-handle"
          style={{
            position: 'absolute',
            left: x2 - 4,
            top: topY2 - 4,
            width: '10px',
            height: '8px',
            backgroundColor: '#d2691e',
            cursor: 'ns-resize',
            zIndex: 15,
            border: '1px solid #fff'
          }}
          onMouseDown={(e) => handleMouseDown2(e, 'top')}
        />
      )}
      
      {/* Bottom handle for second line */}
      {isSelected2 && !isLocked2 && (
        <div
          className="guide-line-handle bottom-handle"
          style={{
            position: 'absolute',
            left: x2 - 4,
            top: bottomY2 - 4,
            width: '10px',
            height: '8px',
            backgroundColor: '#d2691e',
            cursor: 'ns-resize',
            zIndex: 15,
            border: '1px solid #fff'
          }}
          onMouseDown={(e) => handleMouseDown2(e, 'bottom')}
        />
      )}
      
      {/* Control menu when selected */}
      {isSelected && (
        <div
          className="guide-line-controls"
          style={{
            position: 'absolute',
            left: x + 10,
            top: topY,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 20,
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}
        >
          <button
            onClick={toggleLock}
            style={{
              margin: '2px',
              padding: '4px 8px',
              border: 'none',
              borderRadius: '2px',
              backgroundColor: isLocked ? '#d2691e' : '#ccc',
              color: isLocked ? 'white' : 'black',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {isLocked ? 'Unlock' : 'Lock'}
          </button>
          <button
            onClick={toggleVisibility}
            style={{
              margin: '2px',
              padding: '4px 8px',
              border: 'none',
              borderRadius: '2px',
              backgroundColor: '#ccc',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Hide
          </button>
        </div>
      )}

      {/* Control menu for second line when selected */}
      {isSelected2 && (
        <div
          className="guide-line-controls"
          style={{
            position: 'absolute',
            left: x2 + 10,
            top: topY2,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 20,
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}
        >
          <button
            onClick={toggleLock2}
            style={{
              margin: '2px',
              padding: '4px 8px',
              border: 'none',
              borderRadius: '2px',
              backgroundColor: isLocked2 ? '#d2691e' : '#ccc',
              color: isLocked2 ? 'white' : 'black',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {isLocked2 ? 'Unlock' : 'Lock'}
          </button>
          <button
            onClick={toggleVisibility}
            style={{
              margin: '2px',
              padding: '4px 8px',
              border: 'none',
              borderRadius: '2px',
              backgroundColor: '#ccc',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Hide
          </button>
        </div>
      )}
    </>
  );
}
