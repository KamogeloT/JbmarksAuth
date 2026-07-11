/**
 * Standard API error response model matching the backend ApiError format.
 */
export interface ApiError {
  code: string;
  message: string;
  detail?: string;
  traceId: string;
}
