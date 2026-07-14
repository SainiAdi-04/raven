export interface SearchResult {
  id: string;
  title: string;
}

export interface ResolvedStream {
  videoUrl: string;
  audioUrl?: string;
}

export interface Format {
  formatId: string;
  label: string;
}
