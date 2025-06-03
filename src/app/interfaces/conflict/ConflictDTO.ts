import { ResourceType } from "../../enum/ResourceType";
import { ConflictStatus } from "./ConflictStatus";
import { ConflictType } from "./ConflictType";
import { FieldConflictDTO } from "./FieldConflictDTO";

export interface ConflictDTO {
  conflictId: string;
  resourceType: ResourceType;
  resourceId: number;
  type: ConflictType;
  description: string;

  // Versions info
  originalVersion: number;
  currentVersion: number;
  userVersion: number;

  // User info
  currentUserId: number;
  currentUsername?: string;
  conflictingUserId?: number;
  conflictingUsername?: string;
  conflictCreatedAt: string;

  // Field conflicts
  fieldConflicts: FieldConflictDTO[];

  // Metadata
  metadata?: Record<string, any>;

  // Status
  status: ConflictStatus;
}
