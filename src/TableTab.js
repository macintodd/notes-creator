// TableTab.js
import React, { useState } from 'react';
import './TableTab.css';

const columnCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const sizes = {
  Small: 96,
  Medium: 192,
  Large: 384,
};

export default function TableTab({ onPlaceTable }) {
  const [selectedCols, setSelectedCols] = useState(4);
  const [selectedSize, setSelectedSize] = useState('Medium');

  const handleClickPlace = () => {
    
    const config = {
      columns: selectedCols,
      rowHeight: sizes[selectedSize],
    };
    onPlaceTable(config);
    console.log("Placing table with config:", config);
  };

  return (
    <div className="table-tab">
      <div className="table-tab-section">
        <div className="label"># of Columns</div>
        <div className="column-buttons">
          {columnCounts.map((n) => (
            <button
              key={n}
              className={n === selectedCols ? 'active' : ''}
              onClick={() => setSelectedCols(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="table-tab-section">
        <div className="label">Cell Height</div>
        <div className="size-buttons">
          {Object.keys(sizes).map((size) => (
            <button
              key={size}
              className={size === selectedSize ? 'active' : ''}
              onClick={() => setSelectedSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="table-preview-wrapper" onClick={handleClickPlace}>
        <div
          className="table-preview"
          style={{
            height: sizes[selectedSize],
            gridTemplateColumns: `repeat(${selectedCols}, 1fr)`,
          }}
        >
          {Array.from({ length: selectedCols }).map((_, i) => (
            <div key={i} className="preview-cell" />
          ))}
        </div>
        <div className="preview-overlay">Click to place table</div>
      </div>
    </div>
  );
}