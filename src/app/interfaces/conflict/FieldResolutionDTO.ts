export interface FieldResolutionDTO {
  fieldName: string;
  resolution: 'current' | 'user' | 'custom';
  customValue?: any;
  options?: Record<string, any>;
}
