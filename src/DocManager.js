import React, { useState, useRef, useEffect } from 'react';
import './DocManager.css';

export default function DocManager({ onHeaderChange, currentHeader, ...props }) {
  const [activeTab, setActiveTab] = useState('header');
  const [unitNumber, setUnitNumber] = useState('0');
  const [lessonNumber, setLessonNumber] = useState('0');
  const [lessonTitle, setLessonTitle] = useState('Lesson Title');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTitle, setLastSavedTitle] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Update local state when currentHeader prop changes (when document is loaded)
  useEffect(() => {
    if (currentHeader) {
      setUnitNumber(currentHeader.unit || '0');
      setLessonNumber(currentHeader.lesson || '0');
      setLessonTitle(currentHeader.title || 'Lesson Title');
    }
  }, [currentHeader]);

  const tabs = [
    { id: 'auth', label: props.isLoggedIn ? `Logged in` : 'Login' },
    { id: 'header', label: 'Header' },
    { id: 'files', label: 'Files' }
  ];

  useEffect(() => {
    // Notify parent of header changes
    onHeaderChange({
      unit: unitNumber,
      lesson: lessonNumber,
      title: lessonTitle
    });
  }, [unitNumber, lessonNumber, lessonTitle]);

  const handleMouseDown = (e) => {
    dragOffset.current = {
      x: e.clientX - props.position.x,
      y: e.clientY - props.position.y,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    props.onDrag({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const getDocumentTitle = () => {
    return `U${unitNumber}L${lessonNumber}${lessonTitle.replace(/\s+/g, '')}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Construct filename from header fields (matching App.js format)
      const fileName = `U${unitNumber}L${lessonNumber}${lessonTitle.replace(/\s+/g, '')}`;
      
      // Call the parent save handler with just the filename
      // Let the App.js handle all the duplicate detection and overwrite logic
      await props.onSave(fileName);
      setLastSavedTitle(fileName);
      
      // Show saved state briefly
      setTimeout(() => {
        setIsSaving(false);
      }, 1500);
    } catch (error) {
      console.error('Save failed:', error);
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'auth':
        return props.isLoggedIn ? (
          <div className="user-info">
            <img src={props.userName.imageUrl} alt="Profile" className="profile-pic" />
            <span>{props.userName}</span>
          </div>
        ) : (
          <button onClick={props.onLogin} className="login-button">
            Sign in with Google
          </button>
        );

      case 'header':
        return (
          <div className="header-fields">
            <div className="input-group">
              <label>Unit:</label>
              <input
                type="number"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                min="0"
              />
            </div>
            <div className="input-group">
              <label>Lesson:</label>
              <input
                type="number"
                value={lessonNumber}
                onChange={(e) => setLessonNumber(e.target.value)}
                min="0"
              />
            </div>
            <div className="input-group">
              <label>Title:</label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Lesson Title"
              />
            </div>
          </div>
        );

      case 'files':
        return (
          <div className="file-operations">
            <button 
              onClick={handleSave}
              className={`save-button ${isSaving ? 'saved' : ''}`}
              disabled={isSaving}
            >
              {isSaving ? 'Saved!' : 'Save Worksheet'}
            </button>
            <button 
              onClick={props.onLoad}
              disabled={!props.isLoggedIn}
            >
              Load Worksheet
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="doc-manager"
      style={{
        position: 'absolute',
        top: props.position.y,
        left: props.position.x,
        cursor: 'grab',
        zIndex: 1000,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {renderTabContent()}
      </div>
      <div className="toolbar">
        <div className="zoom-controls">
          <button onClick={() => props.setZoom((z) => Math.min(z + 0.1, 2))}>+</button>
          <button onClick={() => props.setZoom(1)}>0</button>
          <button onClick={() => props.setZoom((z) => Math.max(z - 0.1, 0.5))}>−</button>
        </div>
        <div className="snap-toggle">
          <label>
            <input
              type="checkbox"
              checked={props.snapToGrid}
              onChange={props.onToggleSnap}
            />
            STG
          </label>
        </div>
      </div>
    </div>
  );
}