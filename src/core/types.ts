export interface SearchResult {
  id: string;
  title: string;
  uploader?: string;
  duration?: number;
  views?: number;
}

export interface ResolvedStream {
  videoUrl: string;
  audioUrl?: string;
}

export interface Format {
  formatId: string;
  label: string;
}

export interface PickItem {
  display: string;
  preview?: string;
}
