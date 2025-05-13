import { Position } from "./IPosition";

export interface CursorPosition {
  userId: number;
  username: string;
  blockId: number;
  position: Position;
  elementId?: string;
  selectionStart?: number;
  selectionEnd?: number;
  userColor: string;
  timestamp: number;
}