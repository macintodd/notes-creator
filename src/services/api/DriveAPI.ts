import { Worksheet } from '../../types/Worksheet';

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  mimeType: string;
}

class DriveAPI {
  private baseUrl = 'https://www.googleapis.com/upload/drive/v3';  // Changed base URL
  private metadataUrl = 'https://www.googleapis.com/drive/v3';    // Added metadata URL
  
  constructor(private accessToken: string) {}

  async uploadFile(content: Worksheet): Promise<{ id: string }> {
    const metadata = {
      name: `${content.title}.json`,
      mimeType: 'application/json'
    };

    // First create file with metadata
    const metadataResponse = await fetch(`${this.metadataUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!metadataResponse.ok) {
      const errorData = await metadataResponse.json();
      throw new Error(errorData.error?.message || 'Failed to create file');
    }

    const { id } = await metadataResponse.json();

    // Then upload content
    const contentResponse = await fetch(
      `${this.baseUrl}/files/${id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(content)
      }
    );

    if (!contentResponse.ok) {
      throw new Error(`Failed to upload content: ${contentResponse.statusText}`);
    }

    return { id };
  }

  async downloadFile(fileId: string): Promise<Worksheet> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.json();
  }

  async listFiles(): Promise<DriveFile[]> {
    const query = "mimeType='application/json'";
    const response = await fetch(
      `${this.metadataUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,mimeType)`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Failed to list files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  }

  async updateFile(fileId: string, content: Worksheet): Promise<void> {
    const response = await fetch(`${this.baseUrl}/files/${fileId}/content`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(content)
    });

    if (!response.ok) {
      throw new Error(`Failed to update file: ${response.statusText}`);
    }
  }

  async testAccess(): Promise<boolean> {
    const response = await fetch(`${this.metadataUrl}/files?pageSize=1`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Drive access failed');
    }
    
    return true;
  }
}

export default DriveAPI;