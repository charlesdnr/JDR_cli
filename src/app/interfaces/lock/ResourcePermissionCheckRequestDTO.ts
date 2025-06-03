import { ResourceType } from "../../enum/ResourceType";

export interface ResourcePermissionCheckRequestDTO {
    resourceType: ResourceType;
    resourceId: number;
    requiredScope?: string;
  }