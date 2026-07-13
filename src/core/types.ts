export interface SearchResult {
  id: String;
  title: String;
}

export interface ResolvedStream {
  videoUrl: string;
  audioUrl?: string;
}

export interface Format {
  formatId: string;
  label: string;
}