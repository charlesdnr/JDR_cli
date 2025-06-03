import { EditLock } from "./EditLock";

export interface LockResult {
  acquired: boolean;
  lockToken?: string;
  message?: string;
  expiresAt?: string;
  conflictingLock?: EditLock;
}
