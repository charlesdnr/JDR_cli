import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleHttpService extends BaseHttpService {

  constructor() {
    super('api/modules');
  }
}
