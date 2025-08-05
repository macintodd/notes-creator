// GraphTab.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { compile } from 'mathjs';
import './GraphTab.css';

// Grid types (extensible for future)
const GRID_TYPES = {
  CARTESIAN: 'cartesian',
  // Future: CARTESIAN_TRIG: 'cartesian-trig',
  // Future: SEMI_LOG: 'semi-log', 
  // Future: POLAR: 'polar',
  // Future: NUMBER_LINE: 'number-line'
};

// Default graph configuration
const DEFAULT_CONFIG = {
  gridType: GRID_TYPES.CARTESIAN,
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
  xGridSpacing: 1,
  yGridSpacing: 1,
  xLabelSpacing: 2,
  yLabelSpacing: 2,
  showGridlines: true,
  showTicks: false,
  gridDarkness: 'light', // 'light' or 'dark'
  gridColor: '#cccccc',
  xLabel: '',
  yLabel: '',
  functionText: '3*x',
  lineStyle: 'solid' // 'solid' or 'dashed'
};

export default function GraphTab({ onPlaceGraph }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const canvasRef = useRef(null);

  // Update config helper
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Generate and render the graph
  const renderGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Calculate scale
    const xScale = width / (config.xMax - config.xMin);
    const yScale = height / (config.yMax - config.yMin);

    // Transform coordinates from graph space to canvas space
    const toCanvasX = (x) => (x - config.xMin) * xScale;
    const toCanvasY = (y) => height - (y - config.yMin) * yScale;

    // Draw grid
    drawGrid(ctx, width, height, xScale, yScale, toCanvasX, toCanvasY);

    // Draw axes
    drawAxes(ctx, width, height, toCanvasX, toCanvasY);

    // Draw function
    drawFunction(ctx, toCanvasX, toCanvasY);
  }, [config]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  const drawGrid = (ctx, width, height, xScale, yScale, toCanvasX, toCanvasY) => {
    // Set gridline color based on darkness setting
    const gridColor = config.gridDarkness === 'dark' ? '#181818ff' : '#cccccc';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    if (config.showGridlines) {
      // Vertical grid lines
      for (let x = Math.ceil(config.xMin / config.xGridSpacing) * config.xGridSpacing; 
           x <= config.xMax; 
           x += config.xGridSpacing) {
        const canvasX = toCanvasX(x);
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, height);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let y = Math.ceil(config.yMin / config.yGridSpacing) * config.yGridSpacing; 
           y <= config.yMax; 
           y += config.yGridSpacing) {
        const canvasY = toCanvasY(y);
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(width, canvasY);
        ctx.stroke();
      }
    }
  };

  const drawAxes = (ctx, width, height, toCanvasX, toCanvasY) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Draw x-axis (y = 0)
    if (config.yMin <= 0 && config.yMax >= 0) {
      const y = toCanvasY(0);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw y-axis (x = 0)
    if (config.xMin <= 0 && config.xMax >= 0) {
      const x = toCanvasX(0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw labels
    drawAxisLabels(ctx, toCanvasX, toCanvasY);
  };

  const drawAxisLabels = (ctx, toCanvasX, toCanvasY) => {
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // X-axis labels
    for (let x = Math.ceil(config.xMin / config.xLabelSpacing) * config.xLabelSpacing; 
         x <= config.xMax; 
         x += config.xLabelSpacing) {
      if (x !== 0) { // Don't label origin
        const canvasX = toCanvasX(x);
        const labelY = config.yMin <= 0 && config.yMax >= 0 ? toCanvasY(0) + 5 : 15;
        ctx.fillText(x.toString(), canvasX, labelY);
      }
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = Math.ceil(config.yMin / config.yLabelSpacing) * config.yLabelSpacing; 
         y <= config.yMax; 
         y += config.yLabelSpacing) {
      if (y !== 0) { // Don't label origin
        const canvasY = toCanvasY(y);
        const labelX = config.xMin <= 0 && config.xMax >= 0 ? toCanvasX(0) - 5 : 25;
        ctx.fillText(y.toString(), labelX, canvasY);
      }
    }
  };

  const drawFunction = (ctx, toCanvasX, toCanvasY) => {
    if (!config.functionText.trim()) return;

    try {
      // Compile the function expression for better performance
      const expr = compile(config.functionText);
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      
      // Set line style
      if (config.lineStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      let firstPoint = true;

      // Sample points across the x range
      const step = (config.xMax - config.xMin) / 400; // 400 points for smooth curve
      for (let x = config.xMin; x <= config.xMax; x += step) {
        try {
          // Evaluate the expression with the current x value
          const y = expr.evaluate({ x: x });
          
          // Check if y is a valid number and within range
          if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
            const canvasX = toCanvasX(x);
            const canvasY = toCanvasY(y);
            
            // Only draw if point is within canvas bounds
            if (canvasY >= 0 && canvasY <= 400) {
              if (firstPoint) {
                ctx.moveTo(canvasX, canvasY);
                firstPoint = false;
              } else {
                ctx.lineTo(canvasX, canvasY);
              }
            } else {
              firstPoint = true; // Break the line for out-of-bounds points
            }
          } else {
            firstPoint = true; // Break the line for invalid points
          }
        } catch (evalError) {
          // Skip invalid points silently for cleaner experience
          firstPoint = true; // Break the line for evaluation errors
        }
      }
      
      ctx.stroke();
    } catch (error) {
      console.warn('Function parsing error:', error);
    }
  };

  const handlePlaceGraph = () => {
    // Create a data URL of the current graph
    const canvas = canvasRef.current;
    if (!canvas) return;

    const graphData = {
      config: { ...config },
      imageData: canvas.toDataURL('image/png'),
      width: 400,
      height: 400
    };

    onPlaceGraph(graphData);
  };

  return (
    <div className="graph-tab">
      {/* Grid Configuration */}
      <div className="graph-section">
        <div className="label">Grid Configuration</div>
        
        <div className="config-row">
          <label>X Range:</label>
          <input
            type="number"
            value={config.xMin}
            onChange={(e) => updateConfig('xMin', parseFloat(e.target.value))}
            style={{ width: '60px' }}
          />
          <span> to </span>
          <input
            type="number"
            value={config.xMax}
            onChange={(e) => updateConfig('xMax', parseFloat(e.target.value))}
            style={{ width: '60px' }}
          />
        </div>

        <div className="config-row">
          <label>Y Range:</label>
          <input
            type="number"
            value={config.yMin}
            onChange={(e) => updateConfig('yMin', parseFloat(e.target.value))}
            style={{ width: '60px' }}
          />
          <span> to </span>
          <input
            type="number"
            value={config.yMax}
            onChange={(e) => updateConfig('yMax', parseFloat(e.target.value))}
            style={{ width: '60px' }}
          />
        </div>

        <div className="config-row">
          <label>Grid Spacing:</label>
          <span>X: </span>
          <input
            type="number"
            value={config.xGridSpacing}
            onChange={(e) => updateConfig('xGridSpacing', parseFloat(e.target.value))}
            style={{ width: '50px' }}
            step="0.1"
            min="0.1"
          />
          <span> Y: </span>
          <input
            type="number"
            value={config.yGridSpacing}
            onChange={(e) => updateConfig('yGridSpacing', parseFloat(e.target.value))}
            style={{ width: '50px' }}
            step="0.1"
            min="0.1"
          />
        </div>

        <div className="config-row">
          <label>Label Spacing:</label>
          <span>X: </span>
          <input
            type="number"
            value={config.xLabelSpacing}
            onChange={(e) => updateConfig('xLabelSpacing', parseFloat(e.target.value))}
            style={{ width: '50px' }}
            step="0.1"
            min="0.1"
          />
          <span> Y: </span>
          <input
            type="number"
            value={config.yLabelSpacing}
            onChange={(e) => updateConfig('yLabelSpacing', parseFloat(e.target.value))}
            style={{ width: '50px' }}
            step="0.1"
            min="0.1"
          />
        </div>

        <div className="config-row">
          <label>
            <input
              type="checkbox"
              checked={config.showGridlines}
              onChange={(e) => updateConfig('showGridlines', e.target.checked)}
            />
            Show Gridlines
          </label>
        </div>

        {config.showGridlines && (
          <div className="config-row">
            <label>Gridline Darkness:</label>
            <select
              value={config.gridDarkness}
              onChange={(e) => updateConfig('gridDarkness', e.target.value)}
              style={{ width: '80px', marginLeft: '8px' }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        )}
      </div>

      {/* Function Configuration */}
      <div className="graph-section">
        <div className="label">Function</div>
        
        <div className="config-row">
          <label>f(x) = </label>
          <input
            type="text"
            value={config.functionText}
            onChange={(e) => updateConfig('functionText', e.target.value)}
            placeholder="e.g., 3*x, x^2, sin(x)"
            style={{ width: '150px' }}
          />
        </div>

        <div className="config-row">
          <label>Line Style:</label>
          <select
            value={config.lineStyle}
            onChange={(e) => updateConfig('lineStyle', e.target.value)}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
          </select>
        </div>
      </div>

      {/* Graph Preview */}
      <div className="graph-preview-wrapper" onClick={handlePlaceGraph}>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="graph-preview-canvas"
        />
        <div className="preview-overlay">Click to place graph</div>
      </div>
    </div>
  );
}
