import { User } from "./User";

export class UserProfile {
    username: string;
    password: string;
    user: User;

    constructor(username: string, password: string, user: User) {
        this.username = username;
        this.password = password;
        this.user = user;
    }
}
