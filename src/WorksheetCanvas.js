
// WorksheetCanvas.js
import React, { Component } from 'react';
import TextBox from './TextBox';
import TableBlock from './TableBlock';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import './WorksheetCanvas.css';
import Header from './Header';
import Footer from './Footer';
import NotesPrompt from './NotesPrompt';
import VerticalGuideLine from './VerticalGuideLine';
import PropTypes from 'prop-types';

// ...existing code...

export default class WorksheetCanvas extends Component {
  // ...existing code...

  handleProblemResizeMouseDown = (e, element, handle) => {
    e.preventDefault();
    e.stopPropagation();
    this.handleSelectElement(element.id, null);
    this.setState({
      problemResizeState: {
        id: element.id,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: element.width,
        startHeight: element.height,
        startLeft: element.x,
        startTop: element.y,
        handle
      }
    });
    window.addEventListener('mousemove', this.handleProblemResizeMouseMove);
    window.addEventListener('mouseup', this.handleProblemResizeMouseUp);
  };

  handleProblemResizeMouseMove = (e) => {
    const { problemResizeState } = this.state;
    if (!problemResizeState) return;
    const dx = e.clientX - problemResizeState.startX;
    const dy = e.clientY - problemResizeState.startY;
    let newWidth = problemResizeState.startWidth;
    let newHeight = problemResizeState.startHeight;
    let newX = problemResizeState.startLeft;
    let newY = problemResizeState.startTop;

    // Only allow resizing from right/bottom for simplicity
    if (problemResizeState.handle === 'right') {
      newWidth = Math.max(60, problemResizeState.startWidth + dx);
    }
    if (problemResizeState.handle === 'bottom') {
      newHeight = Math.max(40, problemResizeState.startHeight + dy);
    }
    if (problemResizeState.handle === 'bottom-right') {
      newWidth = Math.max(60, problemResizeState.startWidth + dx);
      newHeight = Math.max(40, problemResizeState.startHeight + dy);
    }

    this.setState((prevState) => ({
      elements: prevState.elements.map((el) =>
        el.id === problemResizeState.id
          ? { ...el, width: newWidth, height: newHeight, x: newX, y: newY }
          : el
      )
    }));
  };


  // ...existing code...

  handleProblemResizeMouseDown = (e, element, handle) => {
    e.preventDefault();
    e.stopPropagation();
    this.handleSelectElement(element.id, null);
    this.setState({
      problemResizeState: {
        id: element.id,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: element.width,
        startHeight: element.height,
        startLeft: element.x,
        startTop: element.y,
        handle
      }
    });
    window.addEventListener('mousemove', this.handleProblemResizeMouseMove);
    window.addEventListener('mouseup', this.handleProblemResizeMouseUp);
  };

  handleProblemResizeMouseMove = (e) => {
    const { problemResizeState } = this.state;
    if (!problemResizeState) return;
    const dx = e.clientX - problemResizeState.startX;
    const dy = e.clientY - problemResizeState.startY;
    let newWidth = problemResizeState.startWidth;
    let newHeight = problemResizeState.startHeight;
    let newX = problemResizeState.startLeft;
    let newY = problemResizeState.startTop;

    // Only allow resizing from right/bottom for simplicity
    if (problemResizeState.handle === 'right') {
      newWidth = Math.max(60, problemResizeState.startWidth + dx);
    }
    if (problemResizeState.handle === 'bottom') {
      newHeight = Math.max(40, problemResizeState.startHeight + dy);
    }
    if (problemResizeState.handle === 'bottom-right') {
      newWidth = Math.max(60, problemResizeState.startWidth + dx);
      newHeight = Math.max(40, problemResizeState.startHeight + dy);
    }

    this.setState((prevState) => ({
      elements: prevState.elements.map((el) =>
        el.id === problemResizeState.id
          ? { ...el, width: newWidth, height: newHeight, x: newX, y: newY }
          : el
      )
    }));
  };

  handleProblemResizeMouseUp = () => {
    this.setState({ problemResizeState: null });
    window.removeEventListener('mousemove', this.handleProblemResizeMouseMove);
    window.removeEventListener('mouseup', this.handleProblemResizeMouseUp);
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
      },
      graphDragState: null,
      graphResizeState: null,
      textboxDragState: null, // Track textbox drag state
      problemDragState: null, // Track worksheet problem drag state
      problemResizeState: null, // Track worksheet problem resize state
      clipboardTable: null, // Store copied table structure
      // Guided notes features
      verticalGuideLineX: 144, // 2.0 inches from left (1.75 + 0.25) * 72 = 144px
      showNotesPrompt: true,
      notesPromptText: "Ur notes and\nquestions"
    };
    this.gridSize = 24;
    this.contentRef = React.createRef();
    this.lastPasteTime = 0; // Prevent duplicate paste operations
  }

  // Problem (equation) drag logic for worksheet-dropped equations
  handleProblemMouseDown = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    this.handleSelectElement(element.id, null);
    this.setState({
      problemDragState: {
        id: element.id,
        startX: e.clientX,
        startY: e.clientY,
        originalX: element.x,
        originalY: element.y
      }
    });
    window.addEventListener('mousemove', this.handleProblemMouseMove);
    window.addEventListener('mouseup', this.handleProblemMouseUp);
  }

  handleProblemMouseMove = (e) => {
    const { problemDragState } = this.state;
    if (!problemDragState) return;
    const dx = e.clientX - problemDragState.startX;
    const dy = e.clientY - problemDragState.startY;
    this.setState((prevState) => ({
      elements: prevState.elements.map((el) =>
        el.id === problemDragState.id
          ? { ...el, x: this.props.snapToGrid ? this.snapToGrid(problemDragState.originalX + dx) : problemDragState.originalX + dx,
                      y: this.props.snapToGrid ? this.snapToGrid(problemDragState.originalY + dy) : problemDragState.originalY + dy }
          : el
      )
    }));
  }

  handleProblemMouseUp = () => {
    this.setState({ problemDragState: null });
    window.removeEventListener('mousemove', this.handleProblemMouseMove);
    window.removeEventListener('mouseup', this.handleProblemMouseUp);
  }

  // TextBox drag logic (now matches TableBlock)
  handleTextBoxMouseDown = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    this.handleSelectElement(element.id, null);
    this.setState({
      textboxDragState: {
        id: element.id,
        startX: e.clientX,
        startY: e.clientY,
        originalX: element.x,
        originalY: element.y
      }
    });
  };

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

  // Handler for vertical guide line position changes
  handleVerticalGuideLineChange = (newX) => {
    this.setState({ verticalGuideLineX: newX });
  };

  // Handler for notes prompt text changes
  handleNotesPromptChange = (newText) => {
    this.setState({ notesPromptText: newText });
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
    
    // Position table to the right of vertical guide line (requirement #7)
    let tableX = this.state.verticalGuideLineX + 10; // 10px margin from guide line
    
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
    
    // Table width extends from guide line to right margin (1/4 inch from right edge)
    const rightMargin = 18; // 1/4 inch = 18px (1/4 * 72 = 18)
    const worksheetWidth = 816; // 8.5" * 72 dpi = 612, but canvas is 816
    const tableWidth = worksheetWidth - tableX - rightMargin;
    
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

  handleAddGraph = (graphData) => {
    // Calculate position based on current scroll position
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    const worksheetOffsetTop = this.contentRef.current?.offsetTop || 0;
    const relativeScrollY = Math.max(0, currentScrollY - worksheetOffsetTop);
    
    // Position graph near current view, but ensure it's within worksheet bounds
    const viewportHeight = window.innerHeight;
    let graphY = relativeScrollY + (viewportHeight * 0.3); // 30% down from top of current view
    
    // Ensure the graph stays within worksheet bounds (with some margin)
    const maxY = 2112 - graphData.height - 50; // Two-page height minus graph height and margin
    graphY = Math.min(Math.max(60, graphY), maxY); // Minimum 60px from top, maximum maxY
    
    let graphX = 24; // left margin by default
    
    const newGraph = {
      id: this.state.nextId,
      type: 'graph',
      x: graphX,
      y: graphY,
      width: graphData.width,
      height: graphData.height,
      imageData: graphData.imageData,
      config: graphData.config,
      isSelected: false,
    };

    this.setState((prevState) => ({
      elements: [...prevState.elements, newGraph],
      nextId: prevState.nextId + 1,
    }));
  };

  handleAddText = (textPreset) => {
    console.log('� Adding text box:', textPreset.label);
    
    // Calculate position based on current scroll position - similar to table placement
    const currentScrollY = window.scrollY || document.documentElement.scrollTop;
    const worksheetOffsetTop = this.contentRef.current?.offsetTop || 0;
    const relativeScrollY = Math.max(0, currentScrollY - worksheetOffsetTop);
    
    // Position text near the middle of current view, but ensure it's within worksheet bounds
    const viewportHeight = window.innerHeight;
    let textY = relativeScrollY + (viewportHeight * 0.3); // 30% down from top of current view
    
    // Ensure the text stays within worksheet bounds (with some margin)
    const maxY = 2112 - 100; // Two-page height minus text height margin
    textY = Math.min(Math.max(60, textY), maxY); // Minimum 60px from top, maximum maxY
    
    // Position text to the right of vertical guide line (similar to tables)
    let textX = this.state.verticalGuideLineX; // 10px margin from guide line

    // Snap to grid if enabled
    if (this.props.snapToGrid) {
      textX = this.snapToGrid(textX);
      textY = this.snapToGrid(textY);
    }

    const newTextBox = {
      id: this.state.nextId,
      type: 'textbox',
      x: textX,
      y: textY,
      text: textPreset.preview, // Changed from 'content' to 'text'
      fontSize: textPreset.fontSize,
      fontWeight: textPreset.fontWeight,
      fontStyle: textPreset.fontStyle,
      width: 300, // Default width, adjustable by user
      height: 50, // Default height, adjustable by user
      isSelected: false,
      hasStroke: false, // Default to no stroke
    };

    this.setState((prevState) => ({
      elements: [...prevState.elements, newTextBox],
      nextId: prevState.nextId + 1,
    }));
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

  // Multi-table synchronized update function
  handleMultiTableUpdate = (triggerTableId, updates) => {
    console.log('📐 Multi-table update triggered by:', triggerTableId, updates);
    
    // Find all selected tables
    const selectedTables = this.state.elements.filter(el => el.isSelected && el.type === 'table');
    
    if (selectedTables.length > 1) {
      console.log('📐 Updating', selectedTables.length, 'selected tables');
      
      // Sort tables by Y position (top to bottom)
      const sortedTables = [...selectedTables].sort((a, b) => a.y - b.y);
      
      // Store initial spacing relationships if this is a height change
      if (updates.rowHeight !== undefined) {
        // Calculate initial vertical gaps between consecutive tables
        const initialGaps = [];
        for (let i = 0; i < sortedTables.length - 1; i++) {
          const currentTable = sortedTables[i];
          const nextTable = sortedTables[i + 1];
          const currentBottom = currentTable.y + (currentTable.rowHeight + 20); // +20 for table padding
          const nextTop = nextTable.y;
          const gap = nextTop - currentBottom;
          initialGaps.push(gap);
          console.log(`📐 Initial gap between table ${currentTable.id} and ${nextTable.id}:`, gap);
        }
        
        // Apply updates with maintained spacing
        this.setState((prevState) => ({
          elements: prevState.elements.map((el) => {
            if (el.isSelected && el.type === 'table') {
              console.log('📐 Applying updates to table:', el.id, updates);
              
              // Find this table's position in the sorted array
              const tableIndex = sortedTables.findIndex(t => t.id === el.id);
              let newY = el.y;
              
              // If this is not the first table, calculate new Y position to maintain spacing
              if (tableIndex > 0) {
                // Start from the first table and work down, maintaining gaps
                let cumulativeY = sortedTables[0].y;
                
                for (let i = 0; i < tableIndex; i++) {
                  // Add the height of the current table + its bottom padding
                  cumulativeY += (updates.rowHeight + 20);
                  // Add the original gap to the next table
                  if (i < initialGaps.length) {
                    cumulativeY += initialGaps[i];
                  }
                }
                
                newY = cumulativeY;
                console.log(`📐 Table ${el.id} new Y position to maintain spacing:`, newY);
              }
              
              return {
                ...el,
                // Handle position updates with snap-to-grid and spacing maintenance
                x: this.props.snapToGrid && updates.x !== undefined ? this.snapToGrid(updates.x) : (updates.x ?? el.x),
                y: this.props.snapToGrid ? this.snapToGrid(newY) : newY,
                // Handle rowHeight specifically for tables
                rowHeight: updates.rowHeight !== undefined ? updates.rowHeight : el.rowHeight,
                // Apply any other updates
                ...Object.fromEntries(
                  Object.entries(updates).filter(([key]) => !['x', 'y', 'rowHeight'].includes(key))
                )
              };
            }
            return el;
          }),
        }));
      } else {
        // For non-height updates, use the original logic
        this.setState((prevState) => ({
          elements: prevState.elements.map((el) => {
            if (el.isSelected && el.type === 'table') {
              console.log('📐 Applying updates to table:', el.id, updates);
              return {
                ...el,
                // Handle position updates with snap-to-grid
                x: this.props.snapToGrid && updates.x !== undefined ? this.snapToGrid(updates.x) : (updates.x ?? el.x),
                y: updates.y !== undefined
                  ? (this.props.snapToGrid ? this.snapToGrid(updates.y) : updates.y)
                  : el.y,
                // Apply any other updates
                ...Object.fromEntries(
                  Object.entries(updates).filter(([key]) => !['x', 'y'].includes(key))
                )
              };
            }
            return el;
          }),
        }));
      }
    } else {
      // Fall back to single table update
      this.handleUpdateElement(triggerTableId, updates);
    }
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

  handleSelectElement = (id, event = null) => {
    console.log('🔍 handleSelectElement called with:', { 
      id: id, 
      idType: typeof id,
      event: event ? 'present' : 'null', 
      shiftKey: event?.shiftKey, 
      eventType: event?.type 
    });
    
    // Check if Shift key is pressed for multi-select
    const isShiftSelect = event && event.shiftKey;
    
    this.setState((prevState) => {
      console.log('🔍 BEFORE setState:');
      console.log('  - All elements:', prevState.elements.map(el => ({ id: el.id, type: el.type, isSelected: el.isSelected })));
      console.log('  - Looking for ID:', id, 'type:', typeof id);
      console.log('  - Element IDs:', prevState.elements.map(el => el.id));
      console.log('  - ID matches:', prevState.elements.map(el => ({ id: el.id, matches: el.id === id, strictEquals: el.id === id })));
      
      if (isShiftSelect) {
        // Multi-select mode: add/remove tables from selection
        const clickedElement = prevState.elements.find(el => el.id === id);
        console.log('🔍 Clicked element found:', clickedElement ? { id: clickedElement.id, type: clickedElement.type, isSelected: clickedElement.isSelected } : 'NOT FOUND');
        
        // Only allow multi-select for tables
        if (clickedElement && clickedElement.type === 'table') {
          const currentlySelectedTables = prevState.elements.filter(el => el.type === 'table' && el.isSelected);
          console.log('🔍 Currently selected tables BEFORE operation:', currentlySelectedTables.map(t => ({ id: t.id, isSelected: t.isSelected })));
          
          const newElements = prevState.elements.map((el) => {
            if (el.id === id) {
              // Toggle the clicked table's selection
              const newSelected = !el.isSelected;
              console.log(`🔍 ${newSelected ? 'ADDING' : 'REMOVING'} table ${id} ${newSelected ? 'to' : 'from'} selection (was: ${el.isSelected}, now: ${newSelected})`);
              return { ...el, isSelected: newSelected };
            } else if (el.type !== 'table' && el.isSelected) {
              // Deselect non-table elements when doing table multi-select
              console.log(`🔍 Deselecting non-table element ${el.id}`);
              return { ...el, isSelected: false };
            } else {
              // Keep other table elements' selection state unchanged
              return el;
            }
          });
          
          // Log what the new state will be
          const newSelectedTables = newElements.filter(el => el.type === 'table' && el.isSelected);
          console.log('🔍 NEW selected tables AFTER operation:', newSelectedTables.map(t => ({ id: t.id, isSelected: t.isSelected })));
          
          return { elements: newElements };
        } else {
          // If clicked element is not a table, fall back to single select
          console.log('🔍 Clicked element is not a table (or not found), using single select');
          return {
            elements: prevState.elements.map((el) => ({
              ...el,
              isSelected: el.id === id,
            }))
          };
        }
      } else {
        // Single select mode: select only the clicked element
        console.log('🔍 Single select mode: selecting', id);
        return {
          elements: prevState.elements.map((el) => ({
            ...el,
            isSelected: el.id === id,
          }))
        };
      }
    }, () => {
      // Log the final state after update
      const finalSelectedTables = this.state.elements.filter(el => el.isSelected && el.type === 'table');
      console.log('🔍 FINAL selection state after setState:', finalSelectedTables.map(el => ({ id: el.id, type: el.type })));
    });
    
    // Focus the canvas so keyboard events work
    if (this.contentRef.current) {
      console.log('Focusing canvas for keyboard events');
      this.contentRef.current.focus();
    }
  };

  // Graph drag and resize functionality
  handleGraphMouseDown = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isResizeHandle = e.target.dataset.handle;
    if (isResizeHandle) {
      // Start resize operation
      this.setState({
        graphResizeState: {
          id: element.id,
          startX: e.clientX,
          startY: e.clientY,
          startWidth: element.width,
          startHeight: element.height,
          startLeft: element.x,
          startTop: element.y,
          handle: isResizeHandle
        }
      });
    } else {
      // Start drag operation
      this.handleSelectElement(element.id, null); // null event = single select on drag start
      this.setState({
        graphDragState: {
          id: element.id,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: element.x,
          startTop: element.y
        }
      });
    }
  };

  handleGraphGlobalMouseMove = (e) => {
    const { graphDragState, graphResizeState, textboxDragState } = this.state;
    const { snapToGrid = false } = this.props;
    const gridSize = this.gridSize;

    if (graphDragState) {
      e.preventDefault();
      const dx = e.clientX - graphDragState.startX;
      const dy = e.clientY - graphDragState.startY;
      let newX = graphDragState.startLeft + dx;
      let newY = graphDragState.startTop + dy;
      // Apply snap-to-grid if enabled
      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }
      this.handleUpdateElement(graphDragState.id, { x: newX, y: newY });
    }

    if (textboxDragState) {
      e.preventDefault();
      const dx = e.clientX - textboxDragState.startX;
      const dy = e.clientY - textboxDragState.startY;
      let newX, newY;
      if (snapToGrid) {
        newX = Math.round((textboxDragState.originalX + dx) / gridSize) * gridSize;
        newY = Math.round((textboxDragState.originalY + dy) / gridSize) * gridSize;
      } else {
        newX = textboxDragState.originalX + dx;
        newY = textboxDragState.originalY + dy;
      }
      this.handleUpdateElement(textboxDragState.id, { x: newX, y: newY });
    }

    if (graphResizeState) {
      e.preventDefault();
      const dx = e.clientX - graphResizeState.startX;
      const dy = e.clientY - graphResizeState.startY;
      let newWidth = graphResizeState.startWidth;
      let newHeight = graphResizeState.startHeight;
      let newX = graphResizeState.startLeft;
      let newY = graphResizeState.startTop;

      // Handle different resize directions
      if (graphResizeState.handle.includes('right')) {
        newWidth = Math.max(100, graphResizeState.startWidth + dx);
      }
      if (graphResizeState.handle.includes('left')) {
        const deltaWidth = graphResizeState.startWidth - dx;
        if (deltaWidth >= 100) {
          newWidth = deltaWidth;
          newX = graphResizeState.startLeft + dx;
        }
      }
      if (graphResizeState.handle.includes('bottom')) {
        newHeight = Math.max(100, graphResizeState.startHeight + dy);
      }
      if (graphResizeState.handle.includes('top')) {
        const deltaHeight = graphResizeState.startHeight - dy;
        if (deltaHeight >= 100) {
          newHeight = deltaHeight;
          newY = graphResizeState.startTop + dy;
        }
      }

      // Apply snap-to-grid to position if enabled
      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      this.handleUpdateElement(graphResizeState.id, {
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY
      });
    }
  };

  handleGraphGlobalMouseUp = () => {
    const hadGraphDragState = this.state.graphDragState !== null;
    const hadGraphResizeState = this.state.graphResizeState !== null;
    const hadTextboxDragState = this.state.textboxDragState !== null;

    this.setState({
      graphDragState: null,
      graphResizeState: null,
      textboxDragState: null,
      justFinishedGraphInteraction: hadGraphDragState || hadGraphResizeState || hadTextboxDragState
    });

    // Clear the flag after a brief delay to allow the click event to process
    if (hadGraphDragState || hadGraphResizeState || hadTextboxDragState) {
      setTimeout(() => {
        this.setState({ justFinishedGraphInteraction: false });
      }, 50);
    }
  };

  renderGraphHandles = (element) => {
    if (!element.isSelected) return null;
    
    const handles = [
      'top-left', 'top-right', 'bottom-left', 'bottom-right',
      'top', 'bottom', 'left', 'right',
    ];
    
    const positions = {
      'top-left': { left: -4, top: -4 },
      'top-right': { right: -4, top: -4 },
      'bottom-left': { left: -4, bottom: -4 },
      'bottom-right': { right: -4, bottom: -4 },
      'top': { left: '50%', top: -4, transform: 'translateX(-50%)' },
      'bottom': { left: '50%', bottom: -4, transform: 'translateX(-50%)' },
      'left': { top: '50%', left: -4, transform: 'translateY(-50%)' },
      'right': { top: '50%', right: -4, transform: 'translateY(-50%)' },
    };
    
    return handles.map((handle) => (
      <div
        key={handle}
        data-handle={handle}
        onMouseDown={(e) => {
          e.stopPropagation();
          this.handleGraphMouseDown(e, element);
        }}
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          backgroundColor: 'var(--fall-burnt-orange)',
          border: '1px solid var(--fall-cream)',
          borderRadius: '50%',
          cursor: `${handle}-resize`,
          zIndex: 110,
          ...positions[handle],
        }}
      />
    ));
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
    
    // Check if any text box is currently being edited
    const activeElement = document.activeElement;
    const isEditingText = activeElement && 
      (activeElement.contentEditable === 'true' ||
       activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       activeElement.closest('[contenteditable="true"]'));
    
    // Copy functionality (Cmd+C or Ctrl+C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !isEditingText) {
      console.log('Copy command detected');
      e.preventDefault();
      e.stopPropagation(); // Stop event propagation
      
      const selectedTables = this.state.elements.filter(el => el.isSelected && el.type === 'table');
      
      if (selectedTables.length === 1) {
        const selectedTable = selectedTables[0];
        // Store table structure without cell data
        const tableCopy = {
          type: 'table',
          width: selectedTable.width,
          columns: selectedTable.columns,
          rowHeight: selectedTable.rowHeight,
          // Don't copy cellValues - we want empty tables
        };
        
        this.setState({ clipboardTable: tableCopy });
        console.log('Table copied to clipboard:', tableCopy);
        
        return;
      } else if (selectedTables.length > 1) {
        console.log('Multiple tables selected - copy not supported');
        return;
      } else {
        console.log('No table selected for copying');
        return;
      }
    }
    
    // Paste functionality (Cmd+V or Ctrl+V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !isEditingText) {
      console.log('Paste command detected');
      
      if (this.state.clipboardTable) {
        e.preventDefault();
        e.stopPropagation(); // Stop event propagation to prevent duplicate handling
        
        // Prevent duplicate paste operations within 100ms
        const currentTime = Date.now();
        if (currentTime - this.lastPasteTime < 100) {
          console.log('Duplicate paste prevented');
          return;
        }
        this.lastPasteTime = currentTime;
        
        // Calculate position for pasted table
        const currentScrollY = window.scrollY || document.documentElement.scrollTop;
        const worksheetOffsetTop = this.contentRef.current?.offsetTop || 0;
        const relativeScrollY = Math.max(0, currentScrollY - worksheetOffsetTop);
        
        // Position table near current view, offset from the original
        const viewportHeight = window.innerHeight;
        let pasteY = relativeScrollY + (viewportHeight * 0.3);
        
        // Add offset to avoid pasting directly on top of existing tables
        const existingTables = this.state.elements.filter(el => el.type === 'table');
        if (existingTables.length > 0) {
          // Find the bottommost table and place new table below it
          const maxY = Math.max(...existingTables.map(table => table.y + table.rowHeight));
          pasteY = Math.max(pasteY, maxY + 50); // 50px spacing below the last table
        }
        
        // Ensure the table stays within worksheet bounds
        const maxY = 2112 - 200; // Two-page height minus table height margin
        pasteY = Math.min(Math.max(60, pasteY), maxY);
        
        const pasteX = 24; // left margin
        
        // Check for table alignment opportunities (only when snap-to-grid is off)
        const alignment = this.findTableAlignment(pasteY, pasteX, this.state.clipboardTable.width);
        if (alignment) {
          pasteY = alignment;
          console.log('Pasted table aligned to Y:', pasteY);
        }
        
        // Create new table from clipboard
        const newTable = {
          ...this.state.clipboardTable,
          id: this.state.nextId,
          x: pasteX,
          y: pasteY,
          isSelected: true, // Select the pasted table
          cellValues: Array(this.state.clipboardTable.columns).fill('') // Empty cells
        };
        
        // Deselect all other elements and add the new table
        this.setState((prevState) => ({
          elements: [
            ...prevState.elements.map(el => ({ ...el, isSelected: false })),
            newTable
          ],
          nextId: prevState.nextId + 1,
        }));
        
        console.log('Table pasted:', newTable);
        return;
      } else {
        console.log('No table in clipboard to paste');
        return;
      }
    }
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      console.log('Delete/Backspace key detected');
      
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
    
    // Position text to the right of the vertical guide line (requirement #6)
    textX = this.state.verticalGuideLineX + 10; // 10px margin from guide line
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
        // For directions, use wider text area
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
        <line key={`v-${x}`} x1={x} y1={margin} x2={x} y2={height - margin} stroke="var(--fall-light-taupe)" strokeWidth="1" />
      );
    }
    
    // Horizontal lines for page 1
    for (let y = margin; y <= pageHeight - margin; y += this.gridSize) {
      lines.push(
        <line key={`h1-${y}`} x1={margin} y1={y} x2={width - margin} y2={y} stroke="var(--fall-light-taupe)" strokeWidth="1" />
      );
    }
    
    // Horizontal lines for page 2
    for (let y = pageHeight + margin; y <= height - margin; y += this.gridSize) {
      lines.push(
        <line key={`h2-${y}`} x1={margin} y1={y} x2={width - margin} y2={y} stroke="var(--fall-light-taupe)" strokeWidth="1" />
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
    
    // Add global mouse event listeners for graph dragging/resizing
    document.addEventListener('mousemove', this.handleGraphGlobalMouseMove);
    document.addEventListener('mouseup', this.handleGraphGlobalMouseUp);
    
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
    
    // Remove global mouse event listeners for graph dragging/resizing
    document.removeEventListener('mousemove', this.handleGraphGlobalMouseMove);
    document.removeEventListener('mouseup', this.handleGraphGlobalMouseUp);
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
          // Don't deselect if user is holding Shift (for multi-select)
          // Don't deselect if clicking on table drag handle or after graph interaction
          if (!e.shiftKey && 
              !e.target.classList.contains('table-drag-handle') && 
              !this.state.justFinishedGraphInteraction) {
            console.log('🔍 Canvas clicked - deselecting all (no Shift key)');
            this.handleDeselectAll();
          } else if (e.shiftKey) {
            console.log('🔍 Canvas clicked with Shift - preserving selection for multi-select');
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
        
        {/* Horizontal line separator */}
        <div 
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            top: 42, // 4 pixels below header text (24px header top + 14px font height + 4px gap)
            height: '1px',
            backgroundColor: '#000',
            zIndex: 5
          }}
        />
        
        {/* Notes prompt */}
        {this.state.showNotesPrompt && (
          <NotesPrompt 
            x={24} // Align with grid left margin
            y={50} // Positioned just below the horizontal line
            width={(this.state.verticalGuideLineX + 32) / 2} // About half the distance to the guide line
            initialText={this.state.notesPromptText}
            onUpdate={this.handleNotesPromptChange}
          />
        )}
        
        {/* Vertical guide line */}
        <VerticalGuideLine
          initialX={this.state.verticalGuideLineX}
          onPositionChange={this.handleVerticalGuideLineChange}
          canvasHeight={1584}
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
                backgroundColor={el.backgroundColor || 'transparent'}
                hasStroke={el.hasStroke || false}
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
                onSelect={(id, event) => this.handleSelectElement(id, event)}
                onDeselect={this.handleDeselectAll}
                onUpdate={this.handleUpdateElement}
                onMultiUpdate={this.handleMultiTableUpdate}
                onCellChange={this.handleTableCellChange}
                onProblemUsed={this.handleProblemUsed}
                snapToGrid={this.props.snapToGrid}
                checkAlignment={this.checkTableAlignmentOnDrag}
              />
            );
          }

          if (el.type === 'graph') {
            return (
              <div
                key={el.id}
                className="worksheet-graph"
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  border: el.isSelected ? '2px solid var(--fall-burnt-orange)' : '1px solid var(--fall-taupe)',
                  borderRadius: 4,
                  cursor: 'move',
                  background: 'white',
                  overflow: 'hidden',
                  zIndex: 10 // Render graphs above tables
                }}
                onClick={(e) => this.handleSelectElement(el.id, e)}
                onMouseDown={(e) => this.handleGraphMouseDown(e, el)}
              >
                <img
                  src={el.imageData}
                  alt="Graph"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none'
                  }}
                  draggable={false}
                />
                {el.isSelected && this.renderGraphHandles(el)}
              </div>
            );
          }

          if (el.type === 'textbox') {
            // IMPORTANT: The onMouseDown handler must be attached to the outermost div in TextBox.js for dragging to work.
            // If TextBox renders a contentEditable or input, make sure the wrapper div has onMouseDown={props.onMouseDown}.
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
                hasStroke={el.hasStroke}
                isSelected={!!el.isSelected}
                textAlign={el.textAlign || 'left'}
                onSelect={(id, event) => this.handleSelectElement(id, event)}
                onDeselect={this.handleDeselectAll}
                onUpdate={this.handleUpdateElement}
                onMouseDown={(e) => this.handleTextBoxMouseDown(e, el)}
                backgroundColor={el.backgroundColor || 'transparent'}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  cursor: 'move',
                  zIndex: 20,
                  pointerEvents: 'auto',
                  background: 'transparent',
                  userSelect: 'none',
                }}
              />
            );
          }

          if (el.type === 'problem') {
            // Render resize handles if selected
            const isSelected = !!el.isSelected;
            const resizeHandles = isSelected ? [
              { handle: 'right', style: { right: -6, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
              { handle: 'bottom', style: { left: '50%', bottom: -6, transform: 'translateX(-50%)', cursor: 'ns-resize' } },
              { handle: 'bottom-right', style: { right: -6, bottom: -6, cursor: 'nwse-resize' } }
            ] : [];
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
                  background: 'var(--fall-light-taupe)',
                  border: '1px solid var(--fall-taupe)',
                  borderRadius: 4,
                  padding: 8,
                  cursor: 'move',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 21,
                  userSelect: 'none',
                  boxSizing: 'border-box',
                }}
                onMouseDown={(e) => {
                  // Only drag if not clicking a resize handle
                  if (e.target.dataset && e.target.dataset.handle) return;
                  this.handleProblemMouseDown(e, el);
                }}
                onClick={(e) => this.handleSelectElement(el.id, e)}
              >
                <RenderEquation equation={el.text} />
                {resizeHandles.map(rh => (
                  <div
                    key={rh.handle}
                    data-handle={rh.handle}
                    onMouseDown={e => this.handleProblemResizeMouseDown(e, el, rh.handle)}
                    style={{
                      position: 'absolute',
                      width: 12,
                      height: 12,
                      background: 'var(--fall-burnt-orange)',
                      border: '2px solid #fff',
                      borderRadius: 6,
                      zIndex: 22,
                      ...rh.style
                    }}
                  />
                ))}
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