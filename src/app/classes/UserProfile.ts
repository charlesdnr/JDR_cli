import { Picture } from "./Picture";
import { User } from "./User";

export class UserProfile {
    username: string;
    password: string;
    user: User;
    picture: Picture | null = null;
    modulesCreated: number = 0;
    subscribersCount: number = 0;

    constructor(username: string, password: string, user: User, picture?: Picture) {
        if (!username || !password || !user) {
            throw new Error("Username, password, and user are required.");
        }
        if (picture && !(picture instanceof Picture)) {
            throw new Error("Picture must be an instance of Picture class.");
        }   
        this.username = username;
        this.password = password;
        this.user = user;
    }
}
