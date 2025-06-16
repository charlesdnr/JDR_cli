import { User } from "./User";

export class UserSubscription {
    id: number;
    subscriber: User;
    subscribedTo: User;
    subscribAt: Date;

    constructor(
        id?: number,
        subscriber?: User,
        subscribedTo?: User,
        subscribAt?: Date
    ) {
        this.id = id || 0;
        this.subscriber = subscriber || new User('', '');
        this.subscribedTo = subscribedTo || new User('', '');
        this.subscribAt = subscribAt || new Date();
    }
}