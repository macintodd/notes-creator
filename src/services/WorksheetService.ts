import { Worksheet } from '../types/Worksheet';
import DriveAPI from './api/DriveAPI';

export class WorksheetService {
  private api: DriveAPI;

  constructor(accessToken: string) {
    this.api = new DriveAPI(accessToken);
  }

  async saveWorksheet(worksheet: Worksheet): Promise<string> {
    try {
      const result = await this.api.uploadFile({
        ...worksheet,
        createdAt: new Date().toISOString()
      });
      return result.id;
    } catch (error) {
      console.error('Failed to save worksheet:', error);
      throw new Error('Failed to save worksheet');
    }
  }

  async getWorksheet(fileId: string): Promise<Worksheet> {
    try {
      const result = await this.api.downloadFile(fileId);
      return result as Worksheet;
    } catch (error) {
      console.error('Failed to get worksheet:', error);
      throw new Error('Failed to get worksheet');
    }
  }

  async listWorksheets(): Promise<Array<{ id: string; name: string; createdAt: string }>> {
    try {
      const files = await this.api.listFiles();
      return files.map(file => ({
        id: file.id,
        name: file.name,
        createdAt: file.createdTime
      }));
    } catch (error) {
      console.error('Failed to list worksheets:', error);
      throw new Error('Failed to list worksheets');
    }
  }

  async updateWorksheet(fileId: string, worksheet: Worksheet): Promise<void> {
    try {
      await this.api.updateFile(fileId, worksheet);
    } catch (error) {
      console.error('Failed to update worksheet:', error);
      throw new Error('Failed to update worksheet');
    }
  }
}

export default WorksheetService;