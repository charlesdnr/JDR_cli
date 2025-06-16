import { User } from "./User";

export class ModuleComment {
    id = 1;
    moduleId = 0;
    moduleVersionId?: number;
    user: User | null = null;
    comment = '';
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
}