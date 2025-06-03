import { ResourceType } from '../../enum/ResourceType';

export interface LockRequest {
  resourceType: ResourceType;
  resourceId: number;
  lockScope?: string;
  durationMinutes?: number;
}
