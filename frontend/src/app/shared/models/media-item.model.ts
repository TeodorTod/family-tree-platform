export interface MediaItem {
  id: string;
  memberId: string;
  url: string;       
  type: string;      
  caption?: string | null;
  uploadedAt: string;
}
