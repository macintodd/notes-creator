// TextFormatMenu.js
import React, { Component } from 'react';

class TextFormatMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      position: { x: props.x || 0, y: props.y || 0 },
      dragStart: null,
      showColorPicker: false
    };
    this.menuRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('mousemove', this.handleGlobalMouseMove);
    document.addEventListener('mouseup', this.handleGlobalMouseUp);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.handleGlobalMouseMove);
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);
  }

  handleMouseDown = (e) => {
    if (e.target.classList.contains('menu-header')) {
      e.preventDefault();
      e.stopPropagation();
      this.setState({
        dragStart: {
          x: e.clientX,
          y: e.clientY,
          originX: this.state.position.x,
          originY: this.state.position.y,
        },
      });
    }
  };

  handleGlobalMouseMove = (e) => {
    const { dragStart } = this.state;
    if (dragStart) {
      e.preventDefault();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const newPos = {
        x: dragStart.originX + dx,
        y: dragStart.originY + dy,
      };
      this.setState({ position: newPos });
    }
  };

  handleGlobalMouseUp = () => {
    this.setState({ dragStart: null });
  };

  handleBackgroundColorChange = (color) => {
    const { onBackgroundColorChange } = this.props;
    if (onBackgroundColorChange) {
      onBackgroundColorChange(color);
    }
  };

  handleStrokeToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { onStrokeToggle } = this.props;
    if (onStrokeToggle) {
      onStrokeToggle();
    }
  };

  toggleColorPicker = () => {
    this.setState(prevState => ({
      showColorPicker: !prevState.showColorPicker
    }));
  };

  render() {
    const { position, showColorPicker } = this.state;
    const { onClose, backgroundColor = 'transparent', hasStroke = false } = this.props;
    
    console.log('TextFormatMenu render - hasStroke:', hasStroke); // Debug log

    return (
      <div
        ref={this.menuRef}
        data-text-format-menu="true"
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          backgroundColor: 'var(--fall-cream)',
          border: '1px solid var(--fall-taupe)',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(62, 39, 35, 0.15)',
          zIndex: 200, // Above everything else
          minWidth: '160px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable header */}
        <div
          className="menu-header"
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--fall-light-taupe)',
            borderBottom: '1px solid var(--fall-taupe)',
            borderRadius: '6px 6px 0 0',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            userSelect: 'none'
          }}
          onMouseDown={this.handleMouseDown}
        >
          <span style={{ fontWeight: '500' }}>Text Format</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Menu content */}
        <div style={{ padding: '8px' }}>
          {/* Background Color Section */}
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: showColorPicker ? 'var(--fall-sage)' : 'transparent'
              }}
              onClick={this.toggleColorPicker}
            >
              <span>Background Color</span>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '3px',
                  border: '1px solid var(--fall-light-taupe)',
                  backgroundColor: backgroundColor === 'transparent' ? 'transparent' : backgroundColor,
                  background: backgroundColor === 'transparent' 
                    ? 'linear-gradient(45deg, var(--fall-light-taupe) 25%, transparent 25%), linear-gradient(-45deg, var(--fall-light-taupe) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--fall-light-taupe) 75%), linear-gradient(-45deg, transparent 75%, var(--fall-light-taupe) 75%)'
                    : backgroundColor,
                  backgroundSize: backgroundColor === 'transparent' ? '8px 8px' : 'auto',
                  backgroundPosition: backgroundColor === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto'
                }}
              />
            </div>
            
            {showColorPicker && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px',
                backgroundColor: 'var(--fall-sage)',
                borderRadius: '4px'
              }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Transparent option */}
                  <div
                    onClick={() => this.handleBackgroundColorChange('transparent')}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '4px',
                      border: backgroundColor === 'transparent' ? '2px solid var(--fall-burnt-orange)' : '1px solid var(--fall-taupe)',
                      cursor: 'pointer',
                      background: 'linear-gradient(45deg, var(--fall-light-taupe) 25%, transparent 25%), linear-gradient(-45deg, var(--fall-light-taupe) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--fall-light-taupe) 75%), linear-gradient(-45deg, transparent 75%, var(--fall-light-taupe) 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                      position: 'relative'
                    }}
                    title="Transparent"
                  >
                    {backgroundColor === 'transparent' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '16px',
                        color: 'var(--fall-burnt-orange)',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                  
                  {/* White option */}
                  <div
                    onClick={() => this.handleBackgroundColorChange('white')}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '4px',
                      border: backgroundColor === 'white' ? '2px solid var(--fall-burnt-orange)' : '1px solid var(--fall-taupe)',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="White"
                  >
                    {backgroundColor === 'white' && (
                      <span style={{ color: 'var(--fall-burnt-orange)', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stroke Toggle Section */}
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: 'transparent'
              }}
              onClick={this.handleStrokeToggle}
            >
              <span>Text Stroke</span>
              {/* Toggle Switch */}
              <div
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '20px',
                  backgroundColor: hasStroke ? 'var(--fall-burnt-orange)' : 'var(--fall-light-taupe)',
                  borderRadius: '10px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                {/* Toggle Circle */}
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: hasStroke ? '20px' : '2px',
                    width: '16px',
                    height: '16px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TextFormatMenu;
