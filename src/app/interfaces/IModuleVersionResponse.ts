import { IBlockData } from "./IBlockData";

export interface IModuleVersionResponse {
  id: number;
  moduleId: number;
  version: number;
  published: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  gameSystemId?: number;
  language?: string;
  blocks: IBlockData[]; // tableau d'objets représentant les blocs
}