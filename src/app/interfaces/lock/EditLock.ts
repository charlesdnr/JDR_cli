import { ResourceType } from "../../enum/ResourceType";

export interface EditLock {
  id: number;
  resourceType: ResourceType;
  resourceId: number;
  lockedBy: {
    id: number;
    username: string;
  };
  lockedAt: string;
  expiresAt: string;
  lockToken: string;
  lockScope: string;
  metadata?: string;
}
