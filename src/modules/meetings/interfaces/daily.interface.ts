export interface DailyRoom {
  url: string;
  name: string;
}

export interface DailyErrorResponse {
  info: string;
  error?: string;
}

export interface DailyDeleteResponse {
  deleted: boolean;
  name: string;
}
