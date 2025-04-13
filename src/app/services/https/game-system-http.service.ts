import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';

@Injectable({
  providedIn: 'root'
})
export class GameSystemHttpService extends BaseHttpService {

  constructor() {
    super('api/game-system');
  }
}
