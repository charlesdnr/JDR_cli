import { User } from "./User";

export class ModuleRating {
    id = 1;
    moduleId = 0;
    moduleVersionId = 0;
    user: User | null = null;
    ratings = 0;
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
    
}