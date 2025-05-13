export interface ModuleUpdateDTO {
  userId: number;
  username: string;
  blockId: number;
  operation: 'insert' | 'delete' | 'update';
  content: string;
  startPosition: number;
  endPosition?: number;
  timestamp: number;
}