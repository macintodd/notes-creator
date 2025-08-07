# Math Practice Creator - Project Summary

## Project Overview
A React-based web application for creating mathematics worksheets with Google Drive integration. The app features a drag-and-drop interface for creating professional math worksheets with tables, graphs, text boxes, and problem sets.

## Current Status: WORKING & STABLE
- ✅ Fall color theme fully implemented
- ✅ PDF export functionality working with black/white output
- ✅ Google Drive integration operational
- ✅ All core features functional

## Tech Stack
- **Frontend**: React 18+ with hooks
- **Authentication**: Google OAuth 2.0 (@react-oauth/google)
- **PDF Generation**: html2canvas + jsPDF
- **File Storage**: Google Drive API
- **Styling**: CSS with custom fall color theme variables
- **Math Rendering**: KaTeX for LaTeX equations

## Core Features

### 1. Worksheet Creation
- **WorksheetCanvas**: Main editing surface with 2-page layout
- **Drag & Drop Interface**: Text boxes, tables, graphs, problem sets
- **Grid Snapping**: Toggle-able snap-to-grid functionality
- **Zoom Controls**: Mouse-centered zooming with Ctrl/Cmd + scroll

### 2. Asset Management
- **Problem Sets**: Reusable math problems organized by unit/lesson
- **Table Creation**: Customizable rows/columns with border controls
- **Graph Integration**: Mathematical graphs and charts
- **Header/Footer**: Unit, lesson, title metadata

### 3. Google Drive Integration
- **Authentication**: Persistent login with token refresh
- **File Operations**: Save, load, overwrite detection
- **Folder Organization**: Unit-based folder structure
- **PDF Export**: Direct save to Drive or local download

### 4. PDF Export System
- **Clean Output**: Black text, white background, no UI elements
- **Table Preservation**: Maintains table borders and structure
- **Multi-page**: Automatic 2-page splitting
- **High Quality**: 2x scale rendering for crisp output

## Recent Major Work: PDF Export Color Fix

### Problem Solved
The fall color theme introduced off-white backgrounds (RGB 98%, 97%, 95%) in PDF exports instead of pure white. Required surgical fix to maintain table borders while forcing white backgrounds.

### Solution Implemented
Located in `App.js` lines 677-900+ in `handleExportPDF` function:

1. **CSS Injection**: Comprehensive style rules targeting `.pdf-export-clone`
2. **Selective Targeting**: Remove borders from text boxes, preserve table structure
3. **Color Forcing**: Pure white (#ffffff) backgrounds, black (#000000) text
4. **DOM Manipulation**: Minimal, targeted property setting
5. **Canvas Processing**: html2canvas with white background enforcement

### Key CSS Rules
```css
/* Hide UI elements */
.pdf-export-clone .drag-handle { display: none !important; }
.pdf-export-clone .grid-line { display: none !important; }

/* Force white backgrounds */
.pdf-export-clone .worksheet-canvas { 
  background-color: #ffffff !important;
  background: #ffffff !important;
}

/* Remove text box borders, preserve table borders */
.pdf-export-clone .text-box { border: none !important; }
.pdf-export-clone .react-rnd:not(.table-wrapper) { border: none !important; }

/* Preserve table structure */
.pdf-export-clone .table-cell {
  background: #ffffff !important;
  color: #000000 !important;
}
```

## File Structure

### Core Components
```
src/
├── App.js                 # Main application logic, PDF export
├── WorksheetCanvas.js     # Main editing surface
├── AssetManager.js        # Problem sets, tables, graphs
├── DriveService.js        # Google Drive API integration
├── ModePicker.js          # Tool selection
├── TextBox.js             # Editable text components
├── TableBlock.js          # Table creation/editing
└── services/
    ├── WorksheetService.ts # Worksheet data management
    └── api/
        └── DriveAPI.ts    # Drive API wrapper
```

### Styling
```
src/
├── App.css               # Main app styles with fall theme
├── WorksheetCanvas.css   # Canvas and layout styles
├── AssetManager.css      # Sidebar and controls
├── TableBlock.css        # Table styling
└── ModePicker.css        # Tool picker styles
```

## Fall Color Theme Variables
```css
:root {
  --fall-cream: #faf7f2;        /* Main background */
  --fall-sage: #e8ede8;         /* Secondary background */
  --fall-burnt-orange: #cc5500; /* Primary accent */
  --fall-burgundy: #800020;     /* Secondary accent */
  --fall-taupe: #8b7355;        /* Tertiary accent */
  --fall-charcoal: #36454f;     /* Text color */
}
```

## Google Drive Integration Details

### Authentication Flow
1. OAuth 2.0 with persistent token storage
2. Automatic session restoration on app load
3. Token expiration handling (50-minute refresh)
4. Scope: `drive.file` + `userinfo.profile`

### File Organization
```
Google Drive/
└── Math Practice Creator/
    ├── Unit 1/
    │   ├── Worksheets/
    │   ├── Problem Sets/
    │   └── Worksheet PDFs/
    ├── Unit 2/
    └── ...
```

### Data Format (v2.0)
```json
{
  "version": "2.0",
  "metadata": {
    "title": "U1L1ExampleWorksheet",
    "unit": "1",
    "lesson": "1",
    "created": "2025-01-01T00:00:00.000Z",
    "modified": "2025-01-01T00:00:00.000Z"
  },
  "layout": {
    "elements": [...],
    "usedProblems": [...]
  },
  "problemSets": {...},
  "tableSettings": {...}
}
```

## Known Working Features
- ✅ Worksheet creation and editing
- ✅ Table insertion with customizable borders
- ✅ Text box creation and editing
- ✅ Problem set management
- ✅ Google Drive save/load
- ✅ PDF export with clean black/white output
- ✅ Zoom and grid snapping
- ✅ Multi-page layout
- ✅ Header/footer with metadata
- ✅ Overwrite detection and user prompts

## Development Notes

### PDF Export Function Location
`App.js` lines ~650-950, function `handleExportPDF(headerInfo)`

### Key Implementation Details
1. **Clone DOM Element**: Create off-screen copy for manipulation
2. **CSS Injection**: Add temporary stylesheet with `.pdf-export-clone` rules
3. **Targeted DOM Fixes**: Minimal property setting for color correction
4. **html2canvas Capture**: High-resolution rendering with white background
5. **Multi-page Processing**: Split into two 8.5x11" pages
6. **Cleanup**: Remove temporary elements and styles

### Testing Approach
- Use Digital Color Meter to verify pure white (100%, 100%, 100% RGB)
- Test table border preservation
- Verify text readability and contrast
- Check multi-page splitting accuracy

## Next Potential Features
- Graph/chart creation tools
- LaTeX equation editor
- Template system
- Collaboration features
- Export to other formats
- Print optimization
- Mobile responsiveness

## Critical Code Patterns

### Google Drive Service Usage
```javascript
const serviceToUse = driveService || driveServiceRef.current;
// Always use fallback pattern for reliability
```

### PDF Export CSS Targeting
```css
/* Remove UI elements, preserve content structure */
.pdf-export-clone .text-box { border: none !important; }
.pdf-export-clone .react-rnd:not(.table-wrapper) { border: none !important; }
```

### Error Handling
- Comprehensive try/catch blocks
- Fallback mechanisms for Drive operations
- User-friendly error messages
- Graceful degradation

---

## When Returning to This Project

1. **Copy this entire document** and paste into your conversation
2. **Mention current goal** (new feature, bug fix, etc.)
3. **Reference specific file/function** if working on existing code
4. **Test PDF export** first to ensure color fix is still working

**Last Updated**: August 6, 2025
**Status**: Production Ready, PDF Export Working Perfectly
