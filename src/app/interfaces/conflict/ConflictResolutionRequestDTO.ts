import { FieldResolutionDTO } from "./FieldResolutionDTO";


export interface ConflictResolutionRequestDTO {
  conflictId: string;
  resolutionStrategy: 'auto' | 'manual' | 'cancel';
  fieldResolutions: FieldResolutionDTO[];
  forceOverwrite?: boolean;
  createBackup?: boolean;
  comment?: string;
}
