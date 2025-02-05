import { IUserDetails } from "../interfaces/IUserDetails";
import { User } from "./User";

export class CustomUserDetails implements IUserDetails {
    private readonly _username: string;
    private readonly _password: string;
    private readonly _user: User;

    constructor(username: string, password: string, user: User) {
        this._username = username;
        this._password = password;
        this._user = user;
    }

    get username(): string {
        return this._username;
    }

    get password(): string {
        return this._password;
    }

    get user(): User {
        return this._user;
    }

    get authorities(): string[] {
        return [];
    }

    get accountNonExpired(): boolean {
        return true;
    }

    get accountNonLocked(): boolean {
        return true;
    }

    get credentialsNonExpired(): boolean {
        return true;
    }

    get enabled(): boolean {
        return true;
    }
}