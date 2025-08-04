// ModePicker.js
import React, { useRef } from 'react';
import './ModePicker.css';

export default function ModePicker({
  currentMode,
  onChangeMode,
  zoom,
  setZoom,
  snapToGrid,
  onToggleSnap,
  position,
  onDrag,
}) {
  const modes = ['Text', 'Image', 'Table', 'Problems', 'Writing'];
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    onDrag({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="mode-picker"
      style={{
        position: 'absolute',
        top: position.y,
        left: position.x,
        cursor: 'grab',
        zIndex: 1000,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="mode-buttons">
        {modes.map((mode) => (
          <button
            key={mode}
            className={`mode-button ${currentMode === mode ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onChangeMode(mode);
            }}
          >
            {mode}
          </button>
        ))}
      </div>
      <div className="zoom-controls">
        <button onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}>+</button>
        <button onClick={() => setZoom(1)}>0</button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}>−</button>
      </div>
      <div className="snap-toggle">
        <label>
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={onToggleSnap}
          />
          STG
        </label>
      </div>
    </div>
  );
}