import { ResourceType } from "../../enum/ResourceType";

export interface ResourceLockCheckRequest {
  resourceType: ResourceType;
  resourceId: number;
  requiredScope?: string;
}
