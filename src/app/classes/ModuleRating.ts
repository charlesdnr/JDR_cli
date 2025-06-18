import { User } from "./User";

export class ModuleRating {
    id: number | null = null;
    moduleId = 0;
    moduleVersionId = 0;
    user: User | null = null;
    rating = 0;
    createdAt: Date = new Date();
    updatedAt: Date = new Date();
    
}