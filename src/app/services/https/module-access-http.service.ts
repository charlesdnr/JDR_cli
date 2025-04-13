import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleAccessHttpService extends BaseHttpService {

  constructor() {
    super('api/module-access');
  }
}
