import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlatformStatistics } from '../interfaces/PlatformStatisticsDTO';
import { UserStatistics } from '../interfaces/UserStatisticsDTO';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}api/statistics`;

  // Subject pour les statistiques en temps réel
  private platformStats$ = new BehaviorSubject<PlatformStatistics | null>(null);

  // REST API calls
  getPlatformStatistics(): Observable<PlatformStatistics> {
    return this.http.get<PlatformStatistics>(`${this.apiUrl}/platform`);
  }

  getUserStatistics(userId: number): Observable<UserStatistics> {
    return this.http.get<UserStatistics>(`${this.apiUrl}/user/${userId}`);
  }

  // Observable pour les composants
  get platformStatistics$(): Observable<PlatformStatistics | null> {
    return this.platformStats$.asObservable();
  }

  // Méthode pour mettre à jour les stats (appelée par WebSocket)
  updatePlatformStatistics(stats: PlatformStatistics): void {
    this.platformStats$.next(stats);
  }

  // Méthode pour réinitialiser les statistiques
  reset(): void {
    this.platformStats$.next(null);
  }
}