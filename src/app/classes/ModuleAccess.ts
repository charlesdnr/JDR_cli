export class ModuleAccess {
  id?: number;
  moduleId: number;
  userId: number;
  canView: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canInvite: boolean;

  constructor(
      moduleId: number,
      userId: number,
      canView: boolean,
      canEdit: boolean,
      canPublish: boolean,
      canInvite: boolean,
      id?: number
  ) {
      this.id = id;
      this.moduleId = moduleId;
      this.userId = userId;
      this.canView = canView;
      this.canEdit = canEdit;
      this.canPublish = canPublish;
      this.canInvite = canInvite;
  }
}