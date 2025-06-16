import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { AggregatedRatings } from '../../classes/AggregatedRatings';

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

  public createModuleRating(aggregatedRatings: AggregatedRatings): Promise<AggregatedRatings> {
    return firstValueFrom(this.httpClient.post<AggregatedRatings>(this.baseApiUrl, aggregatedRatings));
  }

  public updateModuleRating(aggregatedRatings: AggregatedRatings): Promise<AggregatedRatings> {
    return firstValueFrom(this.httpClient.put<AggregatedRatings>(`${this.baseApiUrl}/${aggregatedRatings.userRating?.id}`, aggregatedRatings));
  }

  public deleteModuleRating(id: number): Promise<void> {
    return firstValueFrom(this.httpClient.delete<void>(`${this.baseApiUrl}/${id}`));
  }
}
