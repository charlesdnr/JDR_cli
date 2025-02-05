export interface IUserDetails {
    username: string;
    password: string;
    authorities: string[];
    accountNonExpired: boolean;
    accountNonLocked: boolean;
    credentialsNonExpired: boolean;
    enabled: boolean;
}