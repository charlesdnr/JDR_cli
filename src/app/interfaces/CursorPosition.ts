import { Position } from "./IPosition";

export interface CursorPosition {
  userId: number;
  username: string;
  blockId: number;
  position: Position;
  selectionStart?: number;
  selectionEnd?: number;
  userColor: string;
  timestamp: number;
}