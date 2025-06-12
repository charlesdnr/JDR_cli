import { Picture } from './Picture';
import { User } from './User';
import { ModuleVersion } from './ModuleVersion';

export class ModuleSummary {
  id: number;
  title: string;
  description: string;
  creator: User;
  versions: ModuleVersion[];
  picture: Picture;

  constructor(
    id: number = 0,
    title: string = '',
    description: string = '',
    creator: User = new User('', ''),
    versions: ModuleVersion[] = [],
    picture: Picture = new Picture()
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.creator = creator;
    this.versions = versions;
    this.picture = picture;
  }
}