export interface BackupMetadata {
  filename: string;
  size: number;
  createdAt: Date;
  status: 'success' | 'error';
  downloadUrl?: string;
}
