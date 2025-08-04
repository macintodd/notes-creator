// WorksheetCanvas.js
import React, { Component } from 'react';
import TextBox from './TextBox';
import TableBlock from './TableBlock';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import './WorksheetCanvas.css';
import Header from './Header';
import Footer from './Footer';
import PropTypes from 'prop-types';

export default class WorksheetCanvas extends Component {
  static propTypes = {
    snapToGrid: PropTypes.bool,
    zoom: PropTypes.number,
    onHeaderChange: PropTypes.func,
    onProblemUsed: PropTypes.func,
    onLoadUsedProblems: PropTypes.func,
    ref: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      nextId: 1,
      usedProblems: [],
      header: {
        unit: '0',
        lesson: '0',
        title: 'Lesson Title'
      }
    };
    this.gridSize = 24;
    this.contentRef = React.createRef();
  }

  snapToGrid = (value) => {
    const grid = this.gridSize;
    return Math.round(value / grid) * grid;
  };

  handleAddTextBox = () => {
    const newTextBox = {
      id: this.state.nextId,
      type: 'text',
      x: 50,
      y: 50 + 40 * this.state.elements.length,
      width: 200,
      height: 60,
      text: 'Edit me',
      fontSize: 14,
      strokeWidth: 1,
    };

    this.setState((prevState) => ({
      elements: [...prevState.elements, newTextBox],
      nextId: prevState.nextId + 1,
    }));
  };

  // Helper function to find table alignment for dragged tables
  checkTableAlignmentOnDrag = (tableId, newY) => {
    if (this.props.snapToGrid) return newY; // Only work when snap-to-grid is off
    
    const ALIGNMENT_THRESHOLD = 25; // Increased threshold to match visual gap
    // Account for: cell padding (8px top + 8px bottom) + cell borders (2px top + 2px bottom) = 20px
    // Plus table wrapper border (1px) = 21px total visual height beyond rowHeight
    const VISUAL_HEIGHT_ADDITION = 20; // Cell padding + borders
    const BORDER_OVERLAP = 2; // Just overlap the cell borders
    const currentTable = this.state.elements.find(el => el.id === tableId);
    if (!currentTable) return newY;
    
    const otherTables = this.state.elements.filter(el => el.type === 'table' && el.id !== tableId);
    
    console.log('Checking alignment for table', tableId, 'at Y:', newY);
    console.log('Other tables:', otherTables.map(t => ({ id: t.id, y: t.y, height: t.rowHeight })));
    
    for (const table of otherTables) {
      // Calculate the actual visual bottom of the table (not just rowHeight)
      const actualTableBottom = table.y + table.rowHeight + VISUAL_HEIGHT_ADDITION;
      const newTableTop = newY;
      
      // Check if tables have horizontal overlap (with some tolerance)
      const table1Left = table.x - 5; // Add 5px tolerance
      const table1Right = table.x + table.width + 5;
      const table2Left = currentTable.x - 5;
      const table2Right = currentTable.x + currentTable.width + 5;
      
      const hasHorizontalOverlap = 
        (table1Left <= table2Right && table1Right >= table2Left);
      
      // Check if new table's top is close to existing table's actual bottom
      const verticalDistance = Math.abs(newTableTop - actualTableBottom);
      
      console.log('Table comparison:', {
        otherTableId: table.id,
        actualTableBottom,
        newTableTop,
        verticalDistance,
        hasHorizontalOverlap,
        threshold: ALIGNMENT_THRESHOLD
      });
      
      // More lenient alignment check - if the tables are "close enough"
      if (hasHorizontalOverlap && verticalDistance <= ALIGNMENT_THRESHOLD) {
        // Align tables so their borders overlap (share the border line)
        const alignedY = actualTableBottom - BORDER_OVERLAP;
        console.log('SNAPPING: Table', tableId, 'to Y:', alignedY, '(actual table bottom:', actualTableBottom, ')');
        return alignedY;
      }
    }
    
    console.log('No alignment found for table', tableId);
    return newY; // No alignment found, return original position
  };

  // Helper function to find table alignment opportunities
  findTableAlignment = (newTableY, newTableX, newTableWidth) => {
    if (this.props.snapToGrid) return null; // Only work when snap-to-grid is off
    
    const ALIGNMENT_THRESHOLD = 25; // Increased from 5 to match drag threshold
    // Account for table wrapper border (1px) + cell border (2px) = 3px total border thickness
    const BORDER_OVERLAP = 3; 
    const existingTables = this.state.elements.filter(el => el.type === 'table');
    
    console.log('Finding alignment for new table at Y:', newTableY);
    console.log('Existing tables:', existingTables.map(t => ({ id: t.id, y: t.y, height: t.rowHeight })));
    
    for (const table of existingTables) {
      const tableBottom = table.y + table.rowHeight;
      const newTableTop = newTableY;
      
      // Check if tables have horizontal overlap (with tolerance)
      const table1Left = table.x - 5;
      const table1Right = table.x + table.width + 5;
      const table2Left = newTableX - 5;
      const table2Right = newTableX + newTableWidth + 5;
      
      const hasHorizontalOverlap = 
        (table1Left <= table2Right && table1Right >= table2Left);
      
      // Check if new table's top is close to existing table's bottom
      const verticalDistance = Math.abs(newTableTop - tableBottom);
      
      console.log('Table alignment check:', {
        tableId: table.id,
        tableBottom,
        newTableTop,
        verticalDistance,
        hasHorizontalOverlap,
        threshold: ALIGNMENT_THRESHOLD
      });
      
      if (hasHorizontalOverlap && 
          verticalDistance <= ALIGNMENT_THRESHOLD && 
          newTableTop >= tableBottom - ALIGNMENT_THRESHOLD) { // Allow for nearby positioning
        
        // Align tables so their borders overlap (share the border line)
        const alignedY = tableBottom - BORDER_OVERLAP;
        console.log('ALIGNMENT FOUND: New table will be placed at Y:', alignedY, '(with', BORDER_OVERLAP, 'px border overlap)');
        return {
          alignedY: alignedY,
          alignedTable: table
        };
      }
    }
    
    console.log('No alignment found for new table');
    return null;
  };

  handleAddTable = (tableConfig) => {
    const tableCount = this.state.elements.filter(el => el.type === 'table').length;
    let tableX = 24; // left margin
    
    // Calculate position based on current scroll position
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    const worksheetOffsetTop = this.contentRef.current?.offsetTop || 0;
    const relativeScrollY = Math.max(0, currentScrollY - worksheetOffsetTop);
    
    // Position table near current view, but ensure it's within worksheet bounds
    // Add some offset so it appears in a visible area near the middle of current view
    const viewportHeight = window.innerHeight;
    let tableY = relativeScrollY + (viewportHeight * 0.3); // 30% down from top of current view
    
    // Ensure the table stays within worksheet bounds (with some margin)
    const maxY = 2112 - 200; // Two-page height minus table height margin
    tableY = Math.min(Math.max(60, tableY), maxY); // Minimum 60px from top, maximum maxY
    
    const tableWidth = 816 - 48; // worksheet width minus 2*24px margins
    
    // Check for table alignment opportunities (only when snap-to-grid is off)
    const alignment = this.findTableAlignment(tableY, tableX, tableWidth);
    if (alignment) {
      tableY = alignment.alignedY;
      console.log('Aligning new table to existing table at Y:', tableY);
    }
    
    const newTable = {
      id: this.state.nextId,
      type: 'table',
      x: tableX,
      y: tableY,
      width: tableWidth,
      columns: tableConfig.columns,
      rowHeight: tableConfig.rowHeight,
      isSelected: false,
    };

    this.setState((prevState) => ({
      elements: [...prevState.elements, newTable],
      nextId: prevState.nextId + 1,
    }), () => {
      // Auto-number problems after adding new table
      setTimeout(() => this.autoNumberProblems(), 0);
    });
  };

  handleUpdateElement = (id, updates) => {
    console.log('🔄 Handle update element:', id, updates);
    this.setState((prevState) => ({
      elements: prevState.elements.map((el) =>
        el.id === id
          ? {
              ...el,
              ...updates,
              x: this.props.snapToGrid && updates.x !== undefined ? this.snapToGrid(updates.x) : updates.x ?? el.x,
              y: updates.y !== undefined
    ? (this.props.snapToGrid ? this.snapToGrid(updates.y) : updates.y)
    : el.y,
            }
          : el
      ),
    }), () => {
      // Auto-number problems after state update if cellValues were updated
      if (updates.cellValues) {
        console.log('🔄 Triggering auto-numbering from handleUpdateElement');
        // Use setTimeout to ensure state is updated before renumbering
        setTimeout(() => this.autoNumberProblems(), 0);
      }
    });
  };

  handleTableCellChange = (tableId, cellValues) => {
    console.log('📋 Table cell change:', tableId, cellValues);
    // Update the table element with the new cell values
    this.handleUpdateElement(tableId, { cellValues });
    // Note: auto-numbering will be triggered by handleUpdateElement
  };

  // Auto-numbering function for problems in table cells
  autoNumberProblems = () => {
    console.log('🔢 Auto-numbering problems started');
    let problemNumber = 1;
    const updatedElements = [...this.state.elements];
    
    // Sort tables by position (top to bottom, then left to right if same Y)
    const tables = updatedElements
      .filter(el => el.type === 'table')
      .sort((a, b) => {
        if (Math.abs(a.y - b.y) < 10) { // If roughly same Y position
          return a.x - b.x; // Sort by X position
        }
        return a.y - b.y; // Sort by Y position
      });
    
    console.log('🔢 Found tables:', tables.length);
    
    // Process each table in order
    tables.forEach((table, tableIndex) => {
      console.log(`🔢 Processing table ${tableIndex + 1}:`, table.id, 'cellValues:', table.cellValues);
      
      if (table.cellValues) {
        const newCellValues = [...table.cellValues];
        
        // Process cells left to right
        for (let colIdx = 0; colIdx < table.columns; colIdx++) {
          const cellValue = newCellValues[colIdx];
          console.log(`🔢 Cell ${colIdx}:`, cellValue);
          
          // Check if this cell contains a problem
          if (cellValue && typeof cellValue === 'object' && cellValue.type === 'problem') {
            console.log(`🔢 Found problem in cell ${colIdx}, current number: ${problemNumber}`);
            
            // Update the problem text with the current number
            const originalText = cellValue.problemText;
            console.log(`🔢 Original text: "${originalText}"`);
            
            // Remove any existing number (pattern: "number. " at start)
            const cleanText = originalText.replace(/^\d+\.\s*/, '');
            console.log(`🔢 Clean text: "${cleanText}"`);
            
            // Add the new number
            const numberedText = `${problemNumber}. ${cleanText}`;
            console.log(`🔢 Numbered text: "${numberedText}"`);
            
            newCellValues[colIdx] = {
              ...cellValue,
              problemText: numberedText
            };
            
            problemNumber++;
          }
        }
        
        // Update the table with renumbered cell values
        table.cellValues = newCellValues;
      }
    });
    
    console.log('🔢 Auto-numbering complete, updating state');
    // Update state with renumbered problems
    this.setState({ elements: updatedElements });
  };

  handleProblemUsed = (problemId) => {
    this.setState(prevState => ({
      usedProblems: [...new Set([...prevState.usedProblems, problemId])]
    }));
    
    // Also notify parent component
    if (this.props.onProblemUsed) {
      this.props.onProblemUsed(problemId);
    }
  };

  handleSelectElement = (id) => {
    console.log('Selecting element with id:', id);
    
    this.setState((prevState) => ({
      elements: prevState.elements.map((el) => ({
        ...el,
        isSelected: el.id === id,
      })),
    }));
    
    console.log('Elements after selection:', this.state.elements.map(el => ({ id: el.id, type: el.type, isSelected: el.id === id })));
    
    // Focus the canvas so keyboard events work
    if (this.contentRef.current) {
      console.log('Focusing canvas for keyboard events');
      this.contentRef.current.focus();
    }
  };

  handleDeselectAll = () => {
    this.setState((prevState) => ({
      elements: prevState.elements.map((el) => ({
        ...el,
        isSelected: false,
      })),
    }));
  };

  handleKeyDown = (e) => {
    console.log('KeyDown event received:', e.key);
    console.log('Current elements:', this.state.elements.map(el => ({ id: el.id, type: el.type, isSelected: el.isSelected })));
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      console.log('Delete/Backspace key detected');
      
      // Check if any text box is currently being edited
      const activeElement = document.activeElement;
      const isEditingText = activeElement && 
        (activeElement.contentEditable === 'true' ||
         activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.closest('[contenteditable="true"]'));
      
      if (isEditingText) {
        console.log('Text is being edited, ignoring delete key for element deletion');
        return; // Don't delete elements when editing text
      }
      
      const selectedElements = this.state.elements.filter(el => el.isSelected);
      console.log('Selected elements to delete:', selectedElements);
      
      if (selectedElements.length > 0) {
        e.preventDefault(); // Prevent any default behavior
        this.setState((prevState) => {
          const newElements = prevState.elements.filter((el) => !el.isSelected);
          console.log('Elements after deletion:', newElements);
          return { elements: newElements };
        }, () => {
          // Auto-number problems after deletion
          setTimeout(() => this.autoNumberProblems(), 0);
        });
      } else {
        console.log('No selected elements to delete');
      }
    }
  };

  createProblemBlock = (x, y, problems) => {
    // Handle both single problem (string) and multiple problems (array)
    if (Array.isArray(problems)) {
      // Multiple problems - create a block for each one, stacking them vertically
      const newProblems = problems.map((problem, index) => {
        const offsetY = index * 100; // Stack problems with 100px spacing
        return {
          id: this.state.nextId + index,
          type: 'problem',
          x: this.props.snapToGrid ? this.snapToGrid(x) : x,
          y: this.props.snapToGrid ? this.snapToGrid(y + offsetY) : y + offsetY,
          width: 200,
          height: 80,
          text: problem // Each problem should be a string
        };
      });

      this.setState(prevState => ({
        elements: [...prevState.elements, ...newProblems],
        nextId: prevState.nextId + problems.length
      }));
    } else {
      // Single problem
      const newProblem = {
        id: this.state.nextId,
        type: 'problem',
        x: this.props.snapToGrid ? this.snapToGrid(x) : x,
        y: this.props.snapToGrid ? this.snapToGrid(y) : y,
        width: 200,
        height: 80,
        text: problems // problems is actually a single text string in this case
      };

      this.setState(prevState => ({
        elements: [...prevState.elements, newProblem],
        nextId: prevState.nextId + 1
      }));
    }
  };

  createTextBlock = (x, y, textData) => {
    // Define style-specific settings
    let fontSize, fontWeight, fontStyle, text, textWidth, textX;
    
    // Set default position and width
    textX = x;
    textWidth = 200;
    
    // Handle different text styles with specific formatting
    switch (textData.style) {
      case 'text':
        fontSize = 10; // 10pt font
        fontWeight = 'normal';
        fontStyle = 'normal';
        text = 'Click to edit text';
        break;
        
      case 'directions':
        fontSize = 10; // 10pt font
        fontWeight = 'bold';
        fontStyle = 'italic';
        text = 'Directions: Solve each of the following showing applicable work. Circle Final Answer.';
        // Align to left margin
        textX = 24; // Use the same left margin as tables
        // Make width wide enough for the directions text
        textWidth = Math.max(600, text.length * 7); // Roughly 7px per character, minimum 600px
        break;
        
      case 'emphasis':
        fontSize = 14; // 14pt font
        fontWeight = 'bold';
        fontStyle = 'normal';
        text = 'Emphasis';
        break;
        
      case 'hints':
        fontSize = 8; // 8pt font
        fontWeight = 'normal';
        fontStyle = 'normal';
        text = 'Hints';
        break;
        
      default:
        // Fallback for custom text data
        fontSize = parseFloat(textData.fontSize) || 10;
        fontWeight = textData.fontWeight || 'normal';
        fontStyle = textData.fontStyle || 'normal';
        text = textData.text || textData.label || 'Click to edit';
        break;
    }
    
    // Convert pt to px (approximate conversion: 1pt ≈ 1.33px)
    const fontSizePx = fontSize * 1.33;
    
    const newTextBox = {
      id: this.state.nextId,
      type: 'text',
      x: this.props.snapToGrid ? this.snapToGrid(textX) : textX,
      y: this.props.snapToGrid ? this.snapToGrid(y) : y,
      width: textWidth,
      height: 60,
      text: text,
      fontSize: fontSizePx,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      strokeWidth: 1,
      isSelected: true, // Select the newly created text box
      style: textData.style,
      backgroundColor: 'transparent' // Default to transparent background
    };

    this.setState(prevState => ({
      elements: [...prevState.elements, newTextBox],
      nextId: prevState.nextId + 1
    }));
  };

  handleDrop = (e) => {
    e.preventDefault();
    
    // Try different data types
    let data = e.dataTransfer.getData('application/problem');
    let dataType = 'problem';
    
    if (!data) {
      data = e.dataTransfer.getData('application/json');
      dataType = 'json';
    }
    
    try {
      const dropData = JSON.parse(data);
      const rect = this.contentRef.current.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      
      if (dropData.type === 'problems') {
        this.createProblemBlock(dropX, dropY, dropData.content);
        
        // Track used problems
        if (dropData.problemSetName && dropData.originalIndices) {
          console.log('Tracking used problems:', dropData.problemSetName, dropData.originalIndices);
          dropData.originalIndices.forEach(index => {
            const problemId = `${dropData.problemSetName}_${index}`;
            console.log('Marking problem as used:', problemId);
            this.handleProblemUsed(problemId);
          });
        }
      } else if (dropData.type === 'text') {
        this.createTextBlock(dropX, dropY, dropData);
      }
    } catch (error) {
      console.error('Drop handling error:', error);
    }
  };

  handleDragOver = (e) => {
    // Allow drop
    e.preventDefault();
  };

  renderGrid = () => {
    if (!this.props.snapToGrid) return null;

    const width = 816;
    const height = 2112; // Two pages
    const margin = 24;
    const pageHeight = 1056;
    const lines = [];

    // Vertical lines for both pages
    for (let x = margin; x <= width - margin; x += this.gridSize) {
      lines.push(
        <line key={`v-${x}`} x1={x} y1={margin} x2={x} y2={height - margin} stroke="#ddd" strokeWidth="1" />
      );
    }
    
    // Horizontal lines for page 1
    for (let y = margin; y <= pageHeight - margin; y += this.gridSize) {
      lines.push(
        <line key={`h1-${y}`} x1={margin} y1={y} x2={width - margin} y2={y} stroke="#ddd" strokeWidth="1" />
      );
    }
    
    // Horizontal lines for page 2
    for (let y = pageHeight + margin; y <= height - margin; y += this.gridSize) {
      lines.push(
        <line key={`h2-${y}`} x1={margin} y1={y} x2={width - margin} y2={y} stroke="#ddd" strokeWidth="1" />
      );
    }
    
    return <svg className="grid-lines" width={width} height={height}>{lines}</svg>;
  };

  exportData = () => {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      elements: this.state.elements,
      header: this.state.header,
      usedProblems: this.state.usedProblems || [],
      settings: {
        zoom: this.props.zoom,
        snapToGrid: this.props.snapToGrid
      }
    };
  };

  exportTableSettings = () => {
    // Export table-specific settings (hidden borders, custom heights, etc.)
    const tableSettings = {};
    
    this.state.elements.forEach(element => {
      if (element.type === 'table') {
        tableSettings[`table_${element.id}`] = {
          hiddenBorders: element.hiddenBorders || [],
          customHeight: element.rowHeight,
          // Add other table-specific settings as needed
        };
      }
    });
    
    return tableSettings;
  };

  loadData = (worksheetData) => {
    try {
      console.log('Loading worksheet data:', worksheetData);
      
      let elementsToLoad = [];
      let usedProblemsToLoad = [];
      let headerToLoad = { unit: '0', lesson: '0', title: 'Lesson Title' };
      
      // Handle both old format (v1.0) and new format (v2.0)
      if (worksheetData.version === "2.0") {
        // New enhanced format
        const { layout, metadata, tableSettings } = worksheetData;
        elementsToLoad = layout.elements || [];
        headerToLoad = layout.header || headerToLoad;
        usedProblemsToLoad = layout.usedProblems || [];
      } else {
        // Legacy format (v1.0) or older
        elementsToLoad = worksheetData.elements || [];
        headerToLoad = worksheetData.header || headerToLoad;
        usedProblemsToLoad = worksheetData.usedProblems || [];
      }
      
      // Extract used problems from existing table cells (for legacy compatibility)
      const additionalUsedProblems = [];
      elementsToLoad.forEach(element => {
        if (element.type === 'table' && element.cellValues) {
          element.cellValues.forEach(cellValue => {
            if (cellValue && typeof cellValue === 'object' && cellValue.type === 'problem') {
              const problemId = `${cellValue.problemSetName}_${cellValue.problemIndex}`;
              additionalUsedProblems.push(problemId);
              console.log('Found used problem in table cell:', problemId);
            }
          });
        }
      });
      
      // Combine saved used problems with problems found in table cells
      const allUsedProblems = [...new Set([...usedProblemsToLoad, ...additionalUsedProblems])];
      
      // Load the data
      this.setState({
        elements: elementsToLoad,
        header: headerToLoad,
        usedProblems: allUsedProblems,
        nextId: Math.max(1, ...elementsToLoad.map(el => el.id || 0)) + 1
      }, () => {
        // Auto-number problems after loading data
        setTimeout(() => this.autoNumberProblems(), 0);
        
        // Notify parent of loaded header data
        if (this.props.onHeaderChange) {
          this.props.onHeaderChange(headerToLoad);
        }
      });
      
      // Sync used problems with parent App component
      if (this.props.onLoadUsedProblems) {
        this.props.onLoadUsedProblems(allUsedProblems);
      }
      
      console.log('Worksheet data loaded successfully, used problems:', allUsedProblems);
    } catch (error) {
      console.error('Error loading worksheet data:', error);
    }
  };

  componentDidMount() {
    // Add keyboard event listener
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Set up ref methods
    if (this.props.ref) {
      this.props.ref.current = {
        exportData: this.exportData.bind(this),
        exportTableSettings: this.exportTableSettings.bind(this),
        handleHeaderChange: this.handleHeaderChange.bind(this),
        loadData: this.loadData.bind(this)
      };
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleHeaderChange = (headerData) => {
    this.setState({ header: headerData });
  }

  render() {
    const { header } = this.state;
    
    return (
      <div 
        className="worksheet-canvas" 
        ref={this.contentRef}
        tabIndex={0}
        onFocus={() => {
          console.log('Canvas focused');
        }}
        onKeyDown={this.handleKeyDown}
        onDrop={this.handleDrop}
        onDragOver={this.handleDragOver}
        onClick={(e) => {
          if (!e.target.classList.contains('table-drag-handle')) {
            this.handleDeselectAll();
          }
        }}
        style={{ 
          position: 'relative',  // Ensure this is set
          border: '2px solid red'
        }}
      >
        <Header 
          unit={header.unit}
          lesson={header.lesson}
          title={header.title}
        />
        <Footer 
          title={header.title}
          isPage2={false}
        />
        <div className="page-break"></div>
        <Footer 
          title={header.title}
          isPage2={true}
        />
        {this.renderGrid()}
        {this.state.elements.map((el) => {
          if (el.type === 'text') {
            return (
              <TextBox
                key={el.id}
                id={el.id}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                text={el.text}
                fontSize={el.fontSize}
                fontWeight={el.fontWeight}
                fontStyle={el.fontStyle}
                strokeWidth={el.strokeWidth}
                isSelected={!!el.isSelected}
                snapToGrid={this.props.snapToGrid}
                backgroundColor={el.backgroundColor || 'transparent'}
                onSelect={() => this.handleSelectElement(el.id)}
                onDeselect={this.handleDeselectAll}
                onUpdate={this.handleUpdateElement}
              />
            );
          }

          if (el.type === 'table') {
            return (
              <TableBlock
                key={el.id}
                id={el.id}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                columns={el.columns}
                rowHeight={el.rowHeight}
                cellValues={el.cellValues || []} 
                isSelected={!!el.isSelected}
                onSelect={() => this.handleSelectElement(el.id)}
                onDeselect={this.handleDeselectAll}
                onUpdate={this.handleUpdateElement}
                onCellChange={this.handleTableCellChange}
                onProblemUsed={this.handleProblemUsed}
                snapToGrid={this.props.snapToGrid}
                checkAlignment={this.checkTableAlignmentOnDrag}
              />
            );
          }

          if (el.type === 'problem') {
            return (
              <div
                key={el.id}
                className="worksheet-problem"
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  background: '#fffbe6',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  padding: 8,
                  cursor: 'move',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RenderEquation equation={el.text} />
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  }
}

function RenderEquation({ equation }) {
  // Ensure equation is a string
  const equationStr = typeof equation === 'string' ? equation : String(equation || '');
  
  if (equationStr && equationStr.startsWith('$$') && equationStr.endsWith('$$')) {
    return <BlockMath math={equationStr.slice(2, -2)} />;
  }
  return <span>{equationStr}</span>;
}