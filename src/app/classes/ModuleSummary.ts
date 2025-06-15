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
    id = 0,
    title = '',
    description = '',
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