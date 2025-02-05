import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { User } from '../../classes/User';
import { UserResponse } from '../../interfaces/UserResponse';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthHttpService {
  endpoint: string = ""

  constructor(private http: HttpClient) {
    this.endpoint = environment.apiUrl + 'api/auth'
  }

  login(user: User): Promise<UserResponse> {
    return firstValueFrom<UserResponse>(this.http.post<UserResponse>(`${this.endpoint}/login`, user))
  }

  register(user: User): Promise<any>{
    return firstValueFrom(this.http.post(`${this.endpoint}/register`, user))
  }
}
