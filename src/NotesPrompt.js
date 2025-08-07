import React, { useState, useRef } from 'react';
import './NotesPrompt.css';

export default function NotesPrompt({ x = 24, y = 100, width = 120, isVisible = true, initialText = "Ur notes and\nquestions", onUpdate }) {
  const [text, setText] = useState(initialText);
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef(null);
  
  if (!isVisible) return null;
  
  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        textRef.current.select();
      }
    }, 0);
  };
  
  const handleBlur = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate(text);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.metaKey) {
      // Cmd+Enter or Ctrl+Enter to finish editing
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      // Escape to cancel editing
      e.preventDefault();
      setText(initialText);
      setIsEditing(false);
    }
  };
  
  const handleChange = (e) => {
    setText(e.target.value);
  };
  
  return (
    <div 
      className="notes-prompt"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        fontSize: '8pt',
        color: '#3e2723',
        fontFamily: 'Arial, sans-serif',
        zIndex: 5,
        border: '0.75px solid #3e2723',
        padding: '4px 8px',
        backgroundColor: 'white',
        textAlign: 'center',
        cursor: isEditing ? 'text' : 'pointer',
        whiteSpace: 'pre-line'
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textRef}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            fontSize: '8pt',
            fontFamily: 'Arial, sans-serif',
            border: 'none',
            outline: 'none',
            resize: 'none',
            backgroundColor: 'transparent',
            textAlign: 'center',
            width: '100%',
            minHeight: '24px',
            color: '#3e2723'
          }}
          rows={2}
        />
      ) : (
        text
      )}
    </div>
  );
}
