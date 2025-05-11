import { IUser } from "../interfaces/IUser";

export class User implements IUser {
    id: number;
    username = '';
    password: string;
    email: string;

    constructor(email: string, password: string) {
        this.email = email;
        this.password = password;
        this.id = 0;
    }
}