export interface IBlockData {
  type: string;
  moduleVersionId: number;
  title: string;
  blockOrder: number;
  createdBy: string;
  id?: number;
  // Propriétés optionnelles pour les sous-types
  paragraph?: string;
  style?: string;
  moduleId?: number;
}