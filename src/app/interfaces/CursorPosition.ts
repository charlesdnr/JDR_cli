export interface CursorPosition {
  userId: number;
  username: string;
  blockId: number;
  position: {
    x: number;
    y: number;
  };
  selectionStart?: number;
  selectionEnd?: number;
  userColor: string;
  timestamp: number;
}