import { ResourceType } from "../../enum/ResourceType";

export interface LockAcquisitionRequestDTO {
    resourceType: ResourceType;
    resourceId: number;
    lockScope?: string;
    durationMinutes?: number;
  }
  