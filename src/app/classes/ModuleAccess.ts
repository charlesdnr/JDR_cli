import { User } from "./User";

export class ModuleAccess {
  id?: number;
  moduleId: number;
  user: User;
  canView: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canInvite: boolean;

  constructor(
      moduleId: number,
      user: User,
      canView: boolean,
      canEdit: boolean,
      canPublish: boolean,
      canInvite: boolean,
      id?: number
  );
  constructor();
  constructor(
      moduleId?: number,
      user?: User,
      canView?: boolean,
      canEdit?: boolean,
      canPublish?: boolean,
      canInvite?: boolean,
      id?: number
  ) {
      this.id = id;
      this.moduleId = moduleId!;
      this.user = user!;
      this.canView = canView!;
      this.canEdit = canEdit!;
      this.canPublish = canPublish!;
      this.canInvite = canInvite!;
  }
}
