import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { User } from '../../classes/User';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserHttpService extends BaseHttpService {
  currentJdrUser: User | null = null;

  constructor() {
    super('api/user');
  }

  getUserByEmail(email:string): Promise<User> {
    return firstValueFrom(this.httpClient.get<User>(this.apiUrl + '/email/' + email))
  }
}
