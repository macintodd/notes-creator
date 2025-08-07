// TextBox.js (Class-based with drag, resize, select, edit)
import React, { Component, createRef } from 'react';
import TextFormatMenu from './TextFormatMenu';

class TextBox extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isEditing: props.initiallyEditing || false,
      position: { x: props.x, y: props.y },
      size: { width: props.width || 200, height: 'auto' }, // Default width, auto height
      dragStart: null,
      resizeStart: null,
      showFormatMenu: false,
    };

    this.textRef = createRef();
    this.boxRef = createRef();
  }

  componentDidMount() {
    window.addEventListener('mousedown', this.handleClickOutside);
    document.addEventListener('mousemove', this.handleGlobalMouseMove);
    document.addEventListener('mouseup', this.handleGlobalMouseUp);
    if (this.state.isEditing && this.props.initiallyEditing) {
      this.focusAtEnd();
    }
  }

  componentDidUpdate(prevProps) {
    // Only update the contentEditable if we're not editing and the text changed
    if (prevProps.text !== this.props.text && !this.state.isEditing && this.textRef.current) {
      this.textRef.current.textContent = this.props.text || '';
    }
    
    // Show format menu when text box becomes selected
    if (!prevProps.isSelected && this.props.isSelected && !this.state.isEditing) {
      this.setState({ showFormatMenu: true });
    }
    
    // Hide format menu when text box becomes unselected
    if (prevProps.isSelected && !this.props.isSelected) {
      this.setState({ showFormatMenu: false });
    }
  }

  componentWillUnmount() {
    window.removeEventListener('mousedown', this.handleClickOutside);
    document.removeEventListener('mousemove', this.handleGlobalMouseMove);
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
  }

  focusAtEnd = () => {
    const el = this.textRef.current;
    if (el) {
      requestAnimationFrame(() => {
        try {
          el.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (sel && el.childNodes.length > 0) {
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          } else if (sel) {
            // If no child nodes, just set cursor at the beginning
            range.setStart(el, 0);
            range.setEnd(el, 0);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch (error) {
          console.warn('Focus error:', error);
          // Fallback: just focus the element
          el.focus();
        }
      });
    }
  };

  handleClickOutside = (e) => {
    // Check if click was inside the text box
    const clickedInTextBox = this.boxRef.current && this.boxRef.current.contains(e.target);
    
    // Check if click was inside the format menu
    const clickedInFormatMenu = e.target.closest('[data-text-format-menu]');
    
    if (!clickedInTextBox && !clickedInFormatMenu) {
      if (this.state.isEditing) {
        this.handleBlur();
      }
      this.props.onDeselect?.();
    }
  };

  handleMouseDown = (e) => {
    if (this.state.isEditing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const { isSelected, onSelect } = this.props;
    const { position } = this.state;

    const isResizeHandle = e.target.dataset.handle;
    if (isResizeHandle) {
      this.setState({
        resizeStart: {
          x: e.clientX,
          y: e.clientY,
          width: this.state.size.width,
          height: this.state.size.height,
          position: { ...position },
          handle: e.target.dataset.handle,
        },
      });
      return;
    }

    if (!isSelected) {
      onSelect?.();
    }

    this.setState({
      dragStart: {
        x: e.clientX,
        y: e.clientY,
        originX: position.x,
        originY: position.y,
      },
    });
  };

  handleGlobalMouseMove = (e) => {
    const { dragStart, resizeStart } = this.state;
    const { snapToGrid = false } = this.props;
    const gridSize = 24;

    if (dragStart && !this.state.isEditing) {
      e.preventDefault();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      let newX = dragStart.originX + dx;
      let newY = dragStart.originY + dy;
      
      // Apply snap-to-grid if enabled
      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }
      
      const newPos = { x: newX, y: newY };
      this.setState({ position: newPos });
      this.props.onUpdate(this.props.id, { x: newPos.x, y: newPos.y });
    }

    if (resizeStart) {
      e.preventDefault();
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newPos = { ...resizeStart.position };

      // Handle different resize directions
      if (resizeStart.handle.includes('right')) {
        newWidth = Math.max(50, resizeStart.width + dx);
      }
      if (resizeStart.handle.includes('left')) {
        const deltaWidth = resizeStart.width - dx;
        if (deltaWidth >= 50) {
          newWidth = deltaWidth;
          newPos.x = resizeStart.position.x + dx;
        }
      }
      if (resizeStart.handle.includes('bottom')) {
        newHeight = Math.max(24, resizeStart.height + dy);
      }
      if (resizeStart.handle.includes('top')) {
        const deltaHeight = resizeStart.height - dy;
        if (deltaHeight >= 24) {
          newHeight = deltaHeight;
          newPos.y = resizeStart.position.y + dy;
        }
      }

      // Apply snap-to-grid to position if enabled
      if (snapToGrid) {
        newPos.x = Math.round(newPos.x / gridSize) * gridSize;
        newPos.y = Math.round(newPos.y / gridSize) * gridSize;
      }

      this.setState({ 
        size: { width: newWidth, height: newHeight },
        position: newPos
      });
      
      this.props.onUpdate(this.props.id, {
        width: newWidth,
        height: newHeight,
        x: newPos.x,
        y: newPos.y
      });
    }
  };

  handleGlobalMouseUp = () => {
    this.setState({ dragStart: null, resizeStart: null });
  };

  handleMouseMove = (e) => {
    const { dragStart, resizeStart } = this.state;

    if (dragStart && !this.state.isEditing) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const newPos = {
        x: dragStart.originX + dx,
        y: dragStart.originY + dy,
      };
      this.setState({ position: newPos });
      this.props.onUpdate(this.props.id, { left: newPos.x, top: newPos.y });
    }

    if (resizeStart) {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

      if (resizeStart.handle.includes('right')) newWidth += dx;
      if (resizeStart.handle.includes('left')) newWidth -= dx;
      if (resizeStart.handle.includes('bottom')) newHeight += dy;
      if (resizeStart.handle.includes('top')) newHeight -= dy;

      this.setState({ size: { width: newWidth, height: newHeight } });
      this.props.onUpdate(this.props.id, {
        width: newWidth,
        height: newHeight,
      });
    }
  };

  handleMouseUp = () => {
    this.setState({ dragStart: null, resizeStart: null });
  };

  handleDoubleClick = () => {
    this.setState({ isEditing: true }, () => {
      if (this.textRef.current) {
        this.textRef.current.textContent = this.props.text || '';
        this.focusAtEnd();
      }
    });
  };

  handleInput = (e) => {
    if (!e.currentTarget) return;
    
    const plain = e.currentTarget.textContent;
    const scrollHeight = e.currentTarget.scrollHeight;
    
    // Update height based on content
    this.setState({ 
      size: { ...this.state.size, height: scrollHeight }
    });
    
    // Update parent with debounce to avoid too many updates during typing
    clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => {
      // Double-check the element still exists before accessing it
      if (e.currentTarget && this.props.onUpdate) {
        this.props.onUpdate(this.props.id, { 
          text: plain,
          height: scrollHeight
        });
      }
    }, 300); // Longer debounce to reduce updates while typing
  };

  handleBlur = () => {
    // When editing finishes, sync with parent
    if (this.textRef.current && this.props.onUpdate) {
      const finalText = this.textRef.current.textContent || '';
      this.props.onUpdate(this.props.id, { 
        text: finalText,
        height: this.state.size.height
      });
    }
    this.setState({ isEditing: false });
  };

  handleKeyDown = (e) => {
    if (this.state.isEditing) {
      // When editing, stop propagation of certain keys to prevent WorksheetCanvas from handling them
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.stopPropagation();
      }
    }
    
    if (e.key === 'Enter' && e.metaKey) {
      // Cmd+Enter finishes editing
      e.preventDefault();
      e.stopPropagation();
      this.handleBlur();
    } else if (e.key === 'Escape') {
      // Escape cancels editing
      e.preventDefault();
      e.stopPropagation();
      if (this.textRef.current) {
        this.textRef.current.textContent = this.props.text || '';
      }
      this.setState({ isEditing: false });
    }
  };

  handleFormatMenuClose = () => {
    this.setState({ showFormatMenu: false });
  };

  handleBackgroundColorChange = (color) => {
    const { onUpdate, id } = this.props;
    if (onUpdate) {
      onUpdate(id, { backgroundColor: color });
    }
  };

  renderHandles() {
    if (!this.props.isSelected || this.state.isEditing) return null;
    const handles = [
      'top-left', 'top-right', 'bottom-left', 'bottom-right',
      'top', 'bottom', 'left', 'right',
    ];
    const pos = {
      'top-left': { left: -4, top: -4 },
      'top-right': { right: -4, top: -4 },
      'bottom-left': { left: -4, bottom: -4 },
      'bottom-right': { right: -4, bottom: -4 },
      'top': { left: '50%', top: -4, transform: 'translateX(-50%)' },
      'bottom': { left: '50%', bottom: -4, transform: 'translateX(-50%)' },
      'left': { top: '50%', left: -4, transform: 'translateY(-50%)' },
      'right': { top: '50%', right: -4, transform: 'translateY(-50%)' },
    };
    return handles.map((h) => (
      <div
        key={h}
        data-handle={h}
        onMouseDown={(e) => {
          e.stopPropagation();
          this.handleMouseDown(e);
        }}
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          backgroundColor: 'var(--fall-burnt-orange)',
          border: '1px solid var(--fall-cream)',
          borderRadius: '50%',
          cursor: `${h}-resize`,
          zIndex: 110, // Above selected text boxes
          ...pos[h],
        }}
      />
    ));
  }

  render() {
    const { 
      fontSize = 10, 
      fontWeight = 'normal',
      fontStyle = 'normal',
      text, 
      isSelected,
      style = 'regular', // Can be 'regular', 'directions', or 'emphasis'
      backgroundColor = 'transparent'
    } = this.props;
    const { isEditing, position, size, showFormatMenu } = this.state;

    // Use direct font properties if provided, otherwise use predefined styles
    let textStyles;
    if (fontWeight !== 'normal' || fontStyle !== 'normal' || fontSize !== 10) {
      textStyles = {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        fontStyle: fontStyle
      };
    } else {
      textStyles = {
        regular: {
          fontSize: '10pt',
          fontWeight: 'normal',
          fontStyle: 'normal'
        },
        directions: {
          fontSize: '10pt',
          fontWeight: 'bold',
          fontStyle: 'italic'
        },
        emphasis: {
          fontSize: '12pt',
          fontWeight: 'bold',
          fontStyle: 'normal'
        }
      }[style];
    }

    return (
      <>
        <div
          ref={this.boxRef}
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            width: size.width,
            minHeight: 24,
            height: size.height,
            border: isSelected
              ? isEditing ? '2px solid var(--fall-amber)' : '2px solid var(--fall-burnt-orange)'
              : '1px solid var(--fall-light-taupe)',
            padding: 6,
            backgroundColor: backgroundColor === 'transparent' ? 'transparent' : backgroundColor,
            userSelect: isEditing ? 'text' : 'none',
            cursor: isEditing ? 'text' : 'move',
            overflow: 'hidden',
            zIndex: isSelected ? 100 : 10, // Normal: 10 (above tables), Selected: 100 (top layer)
            ...textStyles
          }}
          onMouseDown={this.handleMouseDown}
          onDoubleClick={this.handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <div
              ref={this.textRef}
              contentEditable
              suppressContentEditableWarning
              style={{
                width: '100%',
                height: '100%',
                outline: 'none',
                fontSize,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
              }}
              onInput={this.handleInput}
              onBlur={this.handleBlur}
              onKeyDown={this.handleKeyDown}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                fontSize,
                pointerEvents: 'none',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
              }}
            >
              {text}
            </div>
          )}
          {this.renderHandles()}
        </div>
        
        {/* Format Menu */}
        {showFormatMenu && isSelected && !isEditing && (
          <TextFormatMenu
            x={position.x + size.width + 10}
            y={position.y}
            backgroundColor={backgroundColor}
            onBackgroundColorChange={this.handleBackgroundColorChange}
            onClose={this.handleFormatMenuClose}
          />
        )}
      </>
    );
  }
}

export default TextBox;