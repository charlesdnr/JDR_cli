import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { AggregatedRatings } from '../../classes/AggregatedRatings';
import { ModuleRating } from '../../classes/ModuleRating';

@Injectable({
  providedIn: 'root',
})
export class ModuleRatingsHttpService extends BaseHttpService {

  constructor() {
    super('api/ratings');
  }

  public getModuleRatingsByModule(id: number): Promise<AggregatedRatings> {
    return firstValueFrom(this.httpClient.get<AggregatedRatings>(`${this.baseApiUrl}/module/${id}`));
  }

  public getModuleRatingsByModuleVersion(id: number): Promise<AggregatedRatings> {
    return firstValueFrom(this.httpClient.get<AggregatedRatings>(`${this.baseApiUrl}/version/${id}`));
  }

  public createModuleRating(moduleRating: ModuleRating): Promise<AggregatedRatings> {
    return firstValueFrom(this.httpClient.post<AggregatedRatings>(this.baseApiUrl, moduleRating));
  }

  public updateModuleRating(moduleRating: ModuleRating): Promise<AggregatedRatings> {
    return firstValueFrom(this.httpClient.put<AggregatedRatings>(`${this.baseApiUrl}/${moduleRating.id}`, moduleRating));
  }

  public deleteModuleRating(id: number): Promise<void> {
    return firstValueFrom(this.httpClient.delete<void>(`${this.baseApiUrl}/${id}`));
  }

  public getAllModuleRatingsGroupedByVersion(moduleId: number): Promise<Record<string, ModuleRating[]>> {
    return firstValueFrom(this.httpClient.get<Record<string, ModuleRating[]>>(`${this.baseApiUrl}/module/${moduleId}/all`));
  }
}
