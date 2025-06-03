import { ConflictType } from "./ConflictType";

export interface FieldConflictDTO {
    fieldName: string;
    fieldDisplayName: string;
    originalValue: any;
    currentValue: any;
    userValue: any;
    type: ConflictType;
    
    // Display metadata
    fieldType: string;
    canAutoResolve: boolean;
    autoResolveStrategy?: string;
    
    // Context info
    lastModifiedBy?: number;
    lastModifiedByUsername?: string;
    lastModifiedAt?: string;
    description?: string;
    
    // Suggested resolution
    suggestedResolution?: string;
    resolutionReason?: string;
  }