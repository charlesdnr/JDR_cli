import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleVersionHttpService extends BaseHttpService {

  constructor() {
    super('api/versions');
  }
}

