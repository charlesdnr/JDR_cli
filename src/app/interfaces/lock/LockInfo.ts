import { ResourceType } from "../../enum/ResourceType";

export interface LockInfo {
    lockToken: string;
    resourceType: ResourceType;
    resourceId: number;
    lockScope: string;
    lockedByUsername: string;
    lockedAt: string;
    expiresAt: string;
    isOwnLock: boolean;
  }