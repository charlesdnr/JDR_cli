export interface Notification {
  id: number;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
  recipientId: number;
  senderId: number;
  senderUsername: string;
  moduleId: number;
  moduleTitle: string;
}