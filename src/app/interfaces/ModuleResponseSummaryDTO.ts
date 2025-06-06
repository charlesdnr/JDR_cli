import { Picture } from '../classes/Picture';
import { User } from '../classes/User';
import { ModuleVersion } from '../classes/ModuleVersion';

export interface ModuleResponseSummaryDTO {
  id: number;
  title: string;
  description: string;
  creator: User;
  versions: ModuleVersion[];
  picture: Picture;
}