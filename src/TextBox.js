// TextBox.js (Class-based with drag, resize, select, edit)
import React, { Component, createRef } from 'react';
import TextFormatMenu from './TextFormatMenu';
import katex from 'katex';
import 'katex/dist/katex.min.css';

class TextBox extends Component {
  // Handle mousedown on a resize handle
  handleResizeMouseDown = (e, handle) => {
    e.stopPropagation();
    // Start resizing
    const { width, height } = this.props;
    this.setState({
      resizeStart: {
        x: e.clientX,
        y: e.clientY,
        width: width,
        height: height,
        handle: handle
      }
    });
    // Add global listeners (already added in componentDidMount, so just set state)
    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
  };

  // Global mousemove for resizing
  handleGlobalMouseMove = (e) => {
    const { resizeStart } = this.state;
    if (resizeStart) {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      if (resizeStart.handle.includes('right')) newWidth += dx;
      if (resizeStart.handle.includes('left')) newWidth -= dx;
      if (resizeStart.handle.includes('bottom')) newHeight += dy;
      if (resizeStart.handle.includes('top')) newHeight -= dy;
      // Minimum size
      newWidth = Math.max(40, newWidth);
      newHeight = Math.max(24, newHeight);
      // Update parent
      if (this.props.onUpdate) {
        this.props.onUpdate(this.props.id, {
          width: newWidth,
          height: newHeight
        });
      }
    }
  };

  // Global mouseup for resizing
  handleGlobalMouseUp = (e) => {
    if (this.state.resizeStart) {
      this.setState({ resizeStart: null });
      document.body.style.userSelect = '';
    }
  };
  constructor(props) {
    super(props);
    this.state = {
      isEditing: props.initiallyEditing || false,
      position: { x: props.x - 24, y: props.y },
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
    // REMOVED: This line was causing the issue by setting textContent in the non-editing display div
    // if (prevProps.text !== this.props.text && !this.state.isEditing && this.textRef.current) {
    //   this.textRef.current.textContent = this.props.text || '';
    // }
    
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

  // Drag logic removed; handled by WorksheetCanvas

  // Drag logic removed; handled by WorksheetCanvas

  // Drag logic removed; handled by WorksheetCanvas

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

  handleStrokeToggle = () => {
    const { onUpdate, id, hasStroke = false } = this.props;
    if (onUpdate) {
      onUpdate(id, { hasStroke: !hasStroke });
    }
  };

  // Parse text and render LaTeX expressions
  parseAndRenderText = (text) => {
    if (!text) return '';
    
    // Split text by $$....$$ pattern, keeping the delimiters for processing
    const parts = text.split(/(\$\$[^$]*\$\$)/g);
    
    const renderedParts = parts.map((part, index) => {
      // Check if this part is a LaTeX expression
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const latex = part.slice(2, -2); // Remove $$ delimiters
        
        if (latex.trim() === '') {
          // Empty LaTeX expression, just return empty span
          return <span key={index}></span>;
        }
        
        try {
          const html = katex.renderToString(latex, {
            displayMode: false, // Inline mode
            throwOnError: false,
            errorColor: '#cc0000',
            strict: 'warn'
          });
          return (
            <span 
              key={index}
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ verticalAlign: 'middle' }}
            />
          );
        } catch (error) {
          // If LaTeX parsing fails, show the original text with error styling
          return (
            <span 
              key={index}
              style={{ 
                color: '#cc0000', 
                backgroundColor: '#ffeeee',
                padding: '2px',
                borderRadius: '2px'
              }}
              title={`LaTeX Error: ${error.message}`}
            >
              {part}
            </span>
          );
        }
      } else {
        // Regular text (only render if not empty/whitespace-only)
        return part ? <span key={index}>{part}</span> : null;
      }
    }).filter(Boolean); // Remove null/empty elements
    
    return renderedParts;
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
          if (typeof this.handleResizeMouseDown === 'function') {
            this.handleResizeMouseDown(e, h);
          }
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
      backgroundColor = 'transparent',
      hasStroke = false
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
            left: this.props.x,
            top: this.props.y,
            width: this.props.width,
            minHeight: 24,
            height: this.props.height,
            border: hasStroke 
              ? '1.5px solid black'
              : isSelected
                ? isEditing ? '2px solid var(--fall-amber)' : '2px solid var(--fall-burnt-orange)'
                : '1px solid var(--fall-light-taupe)',
            padding: 4,
            backgroundColor: backgroundColor === 'transparent' ? 'transparent' : backgroundColor,
            userSelect: isEditing ? 'text' : 'none',
            cursor: isEditing ? 'text' : 'move',
            overflow: 'hidden',
            zIndex: isSelected ? 100 : 10, // Normal: 10 (above tables), Selected: 100 (top layer)
            ...textStyles
          }}
          onMouseDown={isEditing ? undefined : this.props.onMouseDown}
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
                display: 'block'
              }}
              onInput={this.handleInput}
              onBlur={this.handleBlur}
              onKeyDown={this.handleKeyDown}
            />
          ) : (
            <>
              {/* Hide the contentEditable div when not editing */}
              <div
                ref={this.textRef}
                contentEditable={false}
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '-9999px',
                  left: '-9999px'
                }}
              />
              {/* Display div for rendered content */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  fontSize,
                  pointerEvents: 'none',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word'
                }}
              >
                {this.parseAndRenderText(text)}
              </div>
            </>
          )}
          {this.renderHandles()}
        </div>
        
        {/* Format Menu */}
        {showFormatMenu && isSelected && !isEditing && (
          <TextFormatMenu
            x={position.x + size.width + 10}
            y={position.y}
            backgroundColor={backgroundColor}
            hasStroke={hasStroke}
            onBackgroundColorChange={this.handleBackgroundColorChange}
            onStrokeToggle={this.handleStrokeToggle}
            onClose={this.handleFormatMenuClose}
          />
        )}
      </>
    );
  }
}

export default TextBox;