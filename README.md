# Math Practice Creator

A React application for creating custom math worksheets with drag-and-drop functionality, LaTeX equation support, and Google Drive integration.

## Features

- 📝 Drag-and-drop worksheet creation
- 🧮 LaTeX equation rendering with KaTeX
- 📊 Customizable tables with auto-numbering
- 🎨 Text formatting options (directions, emphasis, hints)
- 📏 Table alignment and snap-to-grid functionality
- ☁️ Google Drive integration for saving/loading worksheets
- 🖨️ Professional worksheet formatting

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd math-practice-creator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Google OAuth (Required for Google Drive features)**
   
   a. Create a `.env` file in the project root
   
   b. Add your Google OAuth Client ID:
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id-here
   ```
   
   c. To get a Google Client ID:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable the Google Drive API
   - Create OAuth 2.0 credentials
   - Add `http://localhost:3000` to authorized origins

4. **Start the development server**
   ```bash
   npm start
   ```

## Usage

1. **Creating Worksheets**
   - Use the AssetManager panel to drag text elements and tables onto the canvas
   - Drag problems from problem sets into table cells
   - Problems are automatically numbered sequentially

2. **Table Features**
   - Drag tables to align them automatically (when snap-to-grid is off)
   - Hide/show table borders by clicking on border lines
   - Auto-numbering updates when you move tables or edit content

3. **Text Formatting**
   - **Text**: 10pt font, normal style
   - **Directions**: 10pt font, bold italic, left-aligned
   - **Emphasis**: 14pt font, bold
   - **Hints**: 8pt font, normal style

4. **Saving/Loading**
   - Connect to Google Drive to save worksheets
   - Worksheets are saved as JSON files with .worksheet extension

## Security Note

The `.env` file containing your Google Client ID is automatically excluded from Git commits. Never commit API keys or credentials to version control.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
