import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';

@Injectable({
  providedIn: 'root'
})
export class TagHttpService extends BaseHttpService {

  constructor() {
    super('api/tags');
  }
}
