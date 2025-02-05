import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthHttpService {
  endpoint: string = ""

  constructor(private http: HttpClient) {
    this.endpoint = environment.apiUrl
  }

  login(user: any): any {
    return this.http.post(`${this.endpoint}/auth`, user)
  }
}
