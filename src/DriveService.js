class DriveService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
    this.uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
    this.appFolderName = 'Notes Creator';
    this.appFolderId = null; // Will be set when folder is found/created
  }

  async saveWorksheet(data) {
    try {
      console.log('Saving worksheet:', { title: data.title, hasContent: !!data.content, fileId: data.fileId });
      
      // Ensure app folder exists
      if (!this.appFolderId) {
        await this.ensureAppFolder();
      }

      if (data.fileId) {
        // Update existing file
        console.log('Updating existing file:', data.fileId);
        const updateResponse = await fetch(
          `${this.uploadUrl}/files/${data.fileId}?uploadType=multipart`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
            },
            body: this.createMultipartBody(data.title, data.content, this.appFolderId, true)
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Update failed:', errorText);
          throw new Error(`Update failed: ${updateResponse.status} ${errorText}`);
        }

        console.log('File updated successfully');
        return { id: data.fileId, isUpdate: true };
      } else {
        // Check if file with same name already exists
        const existingFile = await this.findExistingFile(data.title);
        
        if (existingFile) {
          console.log('File with same name exists:', existingFile);
          // Return info about existing file so app can prompt user
          return { 
            existingFile: existingFile,
            needsUserDecision: true,
            title: data.title,
            content: data.content
          };
        }

        // Create new file with content in app folder
        console.log('Creating new file in app folder');
        const createResponse = await fetch(
          `${this.uploadUrl}/files?uploadType=multipart`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
            },
            body: this.createMultipartBody(data.title, data.content, this.appFolderId, false)
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('Create failed:', errorText);
          throw new Error(`Create failed: ${createResponse.status} ${errorText}`);
        }

        const result = await createResponse.json();
        console.log('File created successfully:', result.id);
        return { id: result.id, isUpdate: false };
      }
    } catch (error) {
      console.error('Save worksheet error:', error);
      throw error;
    }
  }

  async saveWorksheetForced(data, overwriteFileId = null) {
    try {
      // Ensure app folder exists
      if (!this.appFolderId) {
        await this.ensureAppFolder();
      }

      if (overwriteFileId) {
        // Overwrite specific existing file
        console.log('Overwriting existing file:', overwriteFileId);
        const updateResponse = await fetch(
          `${this.uploadUrl}/files/${overwriteFileId}?uploadType=multipart`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
            },
            body: this.createMultipartBody(data.title, data.content, this.appFolderId, true)
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Overwrite failed: ${updateResponse.status} ${errorText}`);
        }

        return { id: overwriteFileId, isUpdate: true };
      } else {
        // Create new file (even if duplicate name exists)
        const createResponse = await fetch(
          `${this.uploadUrl}/files?uploadType=multipart`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
            },
            body: this.createMultipartBody(data.title, data.content, this.appFolderId, false)
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Create failed: ${createResponse.status} ${errorText}`);
        }

        const result = await createResponse.json();
        return { id: result.id, isUpdate: false };
      }
    } catch (error) {
      console.error('Forced save error:', error);
      throw error;
    }
  }

  createMultipartBody(title, content, parentFolderId = null, isUpdate = false) {
    const boundary = 'foo_bar_baz';
    const metadata = {
      name: title,
      mimeType: 'application/json'
    };

    // Only add parent folder for new files, not updates
    if (parentFolderId && !isUpdate) {
      metadata.parents = [parentFolderId];
    }

    const metadataPart = JSON.stringify(metadata);
    const contentPart = JSON.stringify(content);

    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadataPart,
      '',
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      contentPart,
      '',
      `--${boundary}--`
    ].join('\r\n');

    console.log('Multipart body created, length:', body.length);
    return body;
  }

  async testAccess() {
    try {
      const response = await fetch(`${this.baseUrl}/files?pageSize=1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Drive access failed');
      }
      
      // Also ensure the app folder exists
      await this.ensureAppFolder();
      
      return true;
    } catch (error) {
      console.error('Drive test failed:', error);
      throw error;
    }
  }

  async ensureAppFolder() {
    try {
      // First, search for existing folder
      const searchResponse = await fetch(
        `${this.baseUrl}/files?q=name='${this.appFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!searchResponse.ok) {
        throw new Error('Failed to search for app folder');
      }

      const searchResult = await searchResponse.json();
      
      if (searchResult.files && searchResult.files.length > 0) {
        // Folder exists, use it
        this.appFolderId = searchResult.files[0].id;
        console.log('Found existing app folder:', this.appFolderId);
      } else {
        // Create new folder
        const createResponse = await fetch(`${this.baseUrl}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: this.appFolderName,
            mimeType: 'application/vnd.google-apps.folder'
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create app folder');
        }

        const createResult = await createResponse.json();
        this.appFolderId = createResult.id;
        console.log('Created new app folder:', this.appFolderId);
      }
    } catch (error) {
      console.error('Error with app folder:', error);
      throw error;
    }
  }

  async findExistingFile(fileName) {
    try {
      if (!this.appFolderId) {
        await this.ensureAppFolder();
      }

      const searchResponse = await fetch(
        `${this.baseUrl}/files?q=name='${fileName}' and '${this.appFolderId}' in parents and trashed=false`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!searchResponse.ok) {
        throw new Error('Failed to search for existing file');
      }

      const result = await searchResponse.json();
      return result.files && result.files.length > 0 ? result.files[0] : null;
    } catch (error) {
      console.error('Error searching for existing file:', error);
      return null;
    }
  }

  async loadWorksheet() {
    try {
      // Ensure app folder exists
      if (!this.appFolderId) {
        await this.ensureAppFolder();
      }

      // Use Google Drive Picker API for native file selection
      const selectedFile = await this.openGoogleFilePicker();
      if (!selectedFile) {
        return null; // User cancelled
      }
        
      // Download the selected file content
      const contentResponse = await fetch(
        `${this.baseUrl}/files/${selectedFile.id}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!contentResponse.ok) {
        throw new Error('Failed to download file');
      }

      const content = await contentResponse.json();
      return {
        id: selectedFile.id,
        title: selectedFile.name,
        content: content
      };
    } catch (error) {
      console.error('Load worksheet error:', error);
      throw error;
    }
  }

  async listWorksheets() {
    try {
      // Ensure app folder exists
      if (!this.appFolderId) {
        await this.ensureAppFolder();
      }

      const response = await fetch(
        `${this.baseUrl}/files?q='${this.appFolderId}' in parents and mimeType='application/json' and trashed=false&orderBy=modifiedTime desc`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to list worksheets');
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('List worksheets error:', error);
      throw error;
    }
  }

  // Enhanced folder management for Unit structure
  async ensureUnitFolder(unitNumber) {
    try {
      if (!this.appFolderId) {
        await this.ensureAppFolder();
      }

      const unitFolderName = `Unit ${unitNumber}`;
      
      // Check if unit folder already exists
      const existingUnitFolder = await this.findFolderByName(unitFolderName, this.appFolderId);
      
      if (existingUnitFolder) {
        console.log(`Unit ${unitNumber} folder already exists:`, existingUnitFolder.id);
        return {
          unitFolderId: existingUnitFolder.id,
          worksheetsFolderId: await this.ensureSubfolder(existingUnitFolder.id, 'Worksheets'),
          problemSetsFolderId: await this.ensureSubfolder(existingUnitFolder.id, 'Problem Sets')
        };
      }

      // Create unit folder
      const unitFolder = await this.createFolder(unitFolderName, this.appFolderId);
      console.log(`Created Unit ${unitNumber} folder:`, unitFolder.id);

      // Create subfolders
      const worksheetsFolder = await this.createFolder('Worksheets', unitFolder.id);
      const problemSetsFolder = await this.createFolder('Problem Sets', unitFolder.id);

      return {
        unitFolderId: unitFolder.id,
        worksheetsFolderId: worksheetsFolder.id,
        problemSetsFolderId: problemSetsFolder.id
      };
    } catch (error) {
      console.error(`Error ensuring Unit ${unitNumber} folder:`, error);
      throw error;
    }
  }

  async ensureSubfolder(parentFolderId, folderName) {
    const existingFolder = await this.findFolderByName(folderName, parentFolderId);
    if (existingFolder) {
      return existingFolder.id;
    }
    const newFolder = await this.createFolder(folderName, parentFolderId);
    return newFolder.id;
  }

  async findFolderByName(folderName, parentFolderId) {
    try {
      const query = `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const response = await fetch(
        `${this.baseUrl}/files?q=${encodeURIComponent(query)}`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to find folder: ${response.status}`);
      }

      const result = await response.json();
      return result.files && result.files.length > 0 ? result.files[0] : null;
    } catch (error) {
      console.error('Find folder error:', error);
      throw error;
    }
  }

  async createFolder(folderName, parentFolderId) {
    try {
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      };

      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`Failed to create folder: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create folder error:', error);
      throw error;
    }
  }

  // Problem Set file operations
  async saveProblemSet(unitNumber, problemSetName, problemSetData) {
    try {
      const folders = await this.ensureUnitFolder(unitNumber);
      const fileName = `${problemSetName}.json`;

      // Check if problem set already exists
      const existingFile = await this.findFileInFolder(fileName, folders.problemSetsFolderId);
      
      const content = JSON.stringify({
        version: "1.0",
        metadata: {
          title: problemSetName,
          unit: unitNumber,
          created: existingFile ? existingFile.createdTime : new Date().toISOString(),
          modified: new Date().toISOString()
        },
        problems: problemSetData
      }, null, 2);

      if (existingFile) {
        // Update existing problem set
        const updateResponse = await fetch(
          `${this.uploadUrl}/files/${existingFile.id}?uploadType=multipart`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
            },
            body: this.createMultipartBody(fileName, content, folders.problemSetsFolderId, true)
          }
        );

        if (!updateResponse.ok) {
          throw new Error(`Failed to update problem set: ${updateResponse.status}`);
        }

        return { id: existingFile.id, isUpdate: true };
      } else {
        // Create new problem set file
        const createResponse = await fetch(
          `${this.uploadUrl}/files?uploadType=multipart`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
            },
            body: this.createMultipartBody(fileName, content, folders.problemSetsFolderId, false)
          }
        );

        if (!createResponse.ok) {
          throw new Error(`Failed to create problem set: ${createResponse.status}`);
        }

        const result = await createResponse.json();
        return { id: result.id, isUpdate: false };
      }
    } catch (error) {
      console.error('Save problem set error:', error);
      throw error;
    }
  }

  async loadProblemSet(unitNumber, problemSetFileName) {
    try {
      const folders = await this.ensureUnitFolder(unitNumber);
      const file = await this.findFileInFolder(problemSetFileName, folders.problemSetsFolderId);
      
      if (!file) {
        throw new Error(`Problem set not found: ${problemSetFileName}`);
      }

      const response = await fetch(
        `${this.baseUrl}/files/${file.id}?alt=media`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load problem set: ${response.status}`);
      }

      const content = await response.text();
      return {
        id: file.id,
        name: file.name,
        content: JSON.parse(content)
      };
    } catch (error) {
      console.error('Load problem set error:', error);
      throw error;
    }
  }

  async listProblemSets(unitNumber) {
    try {
      const folders = await this.ensureUnitFolder(unitNumber);
      return await this.listFilesInFolder(folders.problemSetsFolderId);
    } catch (error) {
      console.error('List problem sets error:', error);
      throw error;
    }
  }

  async findFileInFolder(fileName, folderId) {
    try {
      const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
      const response = await fetch(
        `${this.baseUrl}/files?q=${encodeURIComponent(query)}`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to find file: ${response.status}`);
      }

      const result = await response.json();
      return result.files && result.files.length > 0 ? result.files[0] : null;
    } catch (error) {
      console.error('Find file in folder error:', error);
      throw error;
    }
  }

  async listFilesInFolder(folderId) {
    try {
      const query = `'${folderId}' in parents and trashed=false`;
      const response = await fetch(
        `${this.baseUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime)`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('List files in folder error:', error);
      throw error;
    }
  }

  // Enhanced worksheet save to use Unit folder structure
  async saveWorksheetToUnit(worksheetData, unitNumber) {
    try {
      const folders = await this.ensureUnitFolder(unitNumber);
      const fileName = worksheetData.title; // No .json extension for worksheets

      // Check if worksheet already exists in unit folder
      const existingFile = await this.findFileInFolder(fileName, folders.worksheetsFolderId);
      
      if (existingFile) {
        return { 
          existingFile: existingFile,
          needsUserDecision: true,
          title: worksheetData.title,
          content: worksheetData.content,
          unitFolderId: folders.worksheetsFolderId
        };
      }

      // Create new worksheet in unit folder
      const createResponse = await fetch(
        `${this.uploadUrl}/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
          },
          body: this.createMultipartBody(fileName, worksheetData.content, folders.worksheetsFolderId, false)
        }
      );

      if (!createResponse.ok) {
        throw new Error(`Failed to create worksheet: ${createResponse.status}`);
      }

      const result = await createResponse.json();
      return { id: result.id, isUpdate: false };
    } catch (error) {
      console.error('Save worksheet to unit error:', error);
      throw error;
    }
  }

  async getAllWorksheetFiles() {
    try {
      console.log('Getting all worksheet files from app folder:', this.appFolderId);
      
      // First, get all JSON files in the main app folder (legacy files)
      const mainFolderQuery = `'${this.appFolderId}' in parents and mimeType='application/json' and trashed=false`;
      
      const mainResponse = await fetch(
        `${this.baseUrl}/files?q=${encodeURIComponent(mainFolderQuery)}&orderBy=modifiedTime desc&pageSize=100`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!mainResponse.ok) {
        throw new Error('Failed to list main folder files');
      }

      const mainResult = await mainResponse.json();
      console.log('Found files in main folder:', mainResult.files?.length || 0);
      
      const worksheetFiles = [];
      
      // Add main folder files (legacy worksheets)
      for (const file of mainResult.files || []) {
        worksheetFiles.push({
          ...file,
          folderPath: 'Main Folder'
        });
      }
      
      // Now search for files in unit subfolders
      try {
        // Get all unit folders
        const unitFoldersQuery = `'${this.appFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name contains 'Unit' and trashed=false`;
        
        const unitResponse = await fetch(
          `${this.baseUrl}/files?q=${encodeURIComponent(unitFoldersQuery)}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`
            }
          }
        );

        if (unitResponse.ok) {
          const unitResult = await unitResponse.json();
          console.log('Found unit folders:', unitResult.files?.length || 0);
          
          // For each unit folder, find worksheet subfolder and get files
          for (const unitFolder of unitResult.files || []) {
            const worksheetsFolderQuery = `'${unitFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and name='Worksheets' and trashed=false`;
            
            const worksheetsFolderResponse = await fetch(
              `${this.baseUrl}/files?q=${encodeURIComponent(worksheetsFolderQuery)}`,
              {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`
                }
              }
            );
            
            if (worksheetsFolderResponse.ok) {
              const worksheetsFolderResult = await worksheetsFolderResponse.json();
              
              if (worksheetsFolderResult.files && worksheetsFolderResult.files.length > 0) {
                const worksheetsFolder = worksheetsFolderResult.files[0];
                
                // Get worksheet files from this unit's worksheet folder
                const unitWorksheetQuery = `'${worksheetsFolder.id}' in parents and mimeType='application/json' and trashed=false`;
                
                const unitWorksheetResponse = await fetch(
                  `${this.baseUrl}/files?q=${encodeURIComponent(unitWorksheetQuery)}&orderBy=modifiedTime desc`,
                  {
                    headers: {
                      'Authorization': `Bearer ${this.accessToken}`
                    }
                  }
                );
                
                if (unitWorksheetResponse.ok) {
                  const unitWorksheetResult = await unitWorksheetResponse.json();
                  
                  for (const file of unitWorksheetResult.files || []) {
                    worksheetFiles.push({
                      ...file,
                      folderPath: `${unitFolder.name}/Worksheets`
                    });
                  }
                }
              }
            }
          }
        }
      } catch (unitError) {
        console.warn('Error searching unit folders:', unitError);
        // Continue with just main folder files
      }
      
      console.log('Total worksheet files found:', worksheetFiles.length);
      return worksheetFiles;
    } catch (error) {
      console.error('Error getting worksheet files:', error);
      return [];
    }
  }

  async openGoogleFilePicker() {
    return new Promise((resolve) => {
      this.showFolderBrowser(resolve);
    });
  }

  async showFolderBrowser(resolve) {
    // Create modal dialog with folder browser
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 0;
      width: 800px;
      height: 600px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      background: #f8f9fa;
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0;
      color: #333;
      font-size: 18px;
      font-weight: 500;
    `;
    title.textContent = 'Select Worksheet';

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(null);
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create breadcrumb navigation
    const breadcrumb = document.createElement('div');
    breadcrumb.style.cssText = `
      padding: 12px 20px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    `;

    // Create file list container
    const fileListContainer = document.createElement('div');
    fileListContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 0;
    `;

    // Create loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #666;
    `;
    loadingDiv.textContent = 'Loading...';
    fileListContainer.appendChild(loadingDiv);

    dialog.appendChild(header);
    dialog.appendChild(breadcrumb);
    dialog.appendChild(fileListContainer);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    // State for navigation
    let currentFolderId = this.appFolderId;
    let folderStack = [{ id: this.appFolderId, name: 'Notes Creator' }];

    const updateBreadcrumb = () => {
      breadcrumb.innerHTML = folderStack.map((folder, index) => 
        `<span style="cursor: pointer; color: ${index === folderStack.length - 1 ? '#333' : '#4285f4'};" 
               data-folder-id="${folder.id}" data-index="${index}">${folder.name}</span>`
      ).join(' <span style="color: #999;">></span> ');

      // Add click handlers to breadcrumb items
      breadcrumb.querySelectorAll('[data-folder-id]').forEach(span => {
        span.onclick = () => {
          const index = parseInt(span.dataset.index);
          const folderId = span.dataset.folderId;
          folderStack = folderStack.slice(0, index + 1);
          currentFolderId = folderId;
          loadFolder(currentFolderId);
        };
      });
    };

    const loadFolder = async (folderId) => {
      loadingDiv.style.display = 'flex';
      fileListContainer.innerHTML = '';
      fileListContainer.appendChild(loadingDiv);

      try {
        // Get folders and files in current directory
        const response = await fetch(
          `${this.baseUrl}/files?q='${folderId}' in parents and trashed=false&orderBy=folder,name&fields=files(id,name,mimeType,modifiedTime)`,
          {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load folder contents');
        }

        const result = await response.json();
        const files = result.files || [];

        // Clear loading
        fileListContainer.innerHTML = '';

        // Create file list
        const fileList = document.createElement('div');
        fileList.style.cssText = `
          padding: 0;
        `;

        files.forEach(file => {
          const item = document.createElement('div');
          item.style.cssText = `
            padding: 12px 20px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: background-color 0.2s;
          `;

          const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
          const isWorksheet = file.mimeType === 'application/json' && !file.name.includes('.json');

          // Icon
          const icon = document.createElement('span');
          icon.style.cssText = `
            margin-right: 12px;
            font-size: 18px;
            width: 24px;
            text-align: center;
          `;
          icon.textContent = isFolder ? '📁' : (isWorksheet ? '📄' : '📋');

          // Name
          const name = document.createElement('span');
          name.style.cssText = `
            flex: 1;
            font-size: 14px;
            color: ${isFolder ? '#1976d2' : '#333'};
            font-weight: ${isFolder ? '500' : 'normal'};
          `;
          name.textContent = file.name;

          // Modified date
          const modified = document.createElement('span');
          modified.style.cssText = `
            font-size: 12px;
            color: #999;
            margin-left: 16px;
          `;
          if (file.modifiedTime) {
            modified.textContent = new Date(file.modifiedTime).toLocaleDateString();
          }

          item.appendChild(icon);
          item.appendChild(name);
          item.appendChild(modified);

          // Hover effect
          item.onmouseenter = () => item.style.backgroundColor = '#f5f5f5';
          item.onmouseleave = () => item.style.backgroundColor = 'transparent';

          // Click handler
          item.onclick = () => {
            if (isFolder) {
              // Navigate into folder
              folderStack.push({ id: file.id, name: file.name });
              currentFolderId = file.id;
              updateBreadcrumb();
              loadFolder(file.id);
            } else if (file.mimeType === 'application/json') {
              // Select this file
              document.body.removeChild(modal);
              resolve({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType
              });
            }
          };

          fileList.appendChild(item);
        });

        if (files.length === 0) {
          const emptyMsg = document.createElement('div');
          emptyMsg.style.cssText = `
            padding: 40px 20px;
            text-align: center;
            color: #999;
            font-style: italic;
          `;
          emptyMsg.textContent = 'This folder is empty';
          fileList.appendChild(emptyMsg);
        }

        fileListContainer.appendChild(fileList);
        updateBreadcrumb();

      } catch (error) {
        console.error('Error loading folder:', error);
        fileListContainer.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: #d32f2f;">
            Error loading folder: ${error.message}
          </div>
        `;
      }
    };

    // Load initial folder
    loadFolder(currentFolderId);

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeBtn.click();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  // Save PDF file to Google Drive
  async savePDFFile(filename, pdfBlob, folderPath) {
    try {
      console.log('=== SAVE PDF DEBUG START ===');
      console.log('Saving PDF to Drive:', filename, 'in folder:', folderPath);
      console.log('PDF blob size:', pdfBlob.size);
      
      // Ensure app folder exists
      if (!this.appFolderId) {
        console.log('App folder ID not set, ensuring app folder exists...');
        await this.ensureAppFolder();
        console.log('App folder ID after ensure:', this.appFolderId);
      }

      // Navigate to the correct folder path
      let currentFolderId = this.appFolderId;
      const pathParts = folderPath.split('/').filter(part => part.trim() !== '');
      console.log('Path parts:', pathParts);
      
      // Skip the first part if it's the app folder name
      const startIndex = pathParts[0] === this.appFolderName ? 1 : 0;
      console.log('Starting at index:', startIndex);
      
      for (let i = startIndex; i < pathParts.length; i++) {
        const folderName = pathParts[i];
        console.log(`Ensuring subfolder: ${folderName} in parent: ${currentFolderId}`);
        currentFolderId = await this.ensureSubfolder(currentFolderId, folderName);
        console.log(`Subfolder ${folderName} ID:`, currentFolderId);
      }

      console.log('Final target folder ID:', currentFolderId);

      // Check if file already exists
      console.log('Checking if file already exists...');
      const existingFile = await this.findFileInFolder(filename, currentFolderId);
      if (existingFile) {
        console.log('PDF file already exists, will UPDATE:', existingFile.id);
        console.log('Existing file details:', existingFile);
      } else {
        console.log('PDF file does not exist, will CREATE new file');
      }

      if (existingFile) {
        console.log('=== TAKING UPDATE PATH ===');
        // For updates, we need to use a different approach
        // First update the file content without changing parents
        const updateMetadata = {
          name: filename,
          mimeType: 'application/pdf'
          // Don't include parents for updates - it causes the error
        };
        console.log('Update metadata (NO PARENTS):', updateMetadata);

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(updateMetadata)], { type: 'application/json' }));
        form.append('file', pdfBlob);

        const updateUrl = `${this.uploadUrl}/files/${existingFile.id}?uploadType=multipart`;
        console.log('Update URL:', updateUrl);
        console.log('Update method: PATCH');

        const response = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: form
        });

        console.log('Update response status:', response.status);
        console.log('Update response ok:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('PDF update failed with response:', errorText);
          throw new Error(`PDF update failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('PDF updated successfully:', result);
        console.log('=== SAVE PDF DEBUG END (UPDATE SUCCESS) ===');
        return result;

      } else {
        console.log('=== TAKING CREATE PATH ===');
        // For new files, we can include parents
        const createMetadata = {
          name: filename,
          parents: [currentFolderId],
          mimeType: 'application/pdf'
        };
        console.log('Create metadata (WITH PARENTS):', createMetadata);

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(createMetadata)], { type: 'application/json' }));
        form.append('file', pdfBlob);

        const createUrl = `${this.uploadUrl}/files?uploadType=multipart`;
        console.log('Create URL:', createUrl);
        console.log('Create method: POST');

        const response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: form
        });

        console.log('Create response status:', response.status);
        console.log('Create response ok:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('PDF creation failed with response:', errorText);
          throw new Error(`PDF creation failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('PDF created successfully:', result);
        console.log('=== SAVE PDF DEBUG END (CREATE SUCCESS) ===');
        return result;
      }
    } catch (error) {
      console.error('=== SAVE PDF DEBUG ERROR ===');
      console.error('Error saving PDF to Drive:', error);
      console.error('Error stack:', error.stack);
      console.error('=== SAVE PDF DEBUG END (ERROR) ===');
      throw error;
    }
  }
}

export default DriveService;