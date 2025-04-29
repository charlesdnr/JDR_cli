import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIGenerationRequest {
  type: string;
  parameters: Record<string, string>;
}

export interface AIGenerationResponse {
  content: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIGenerationService {

  private apiUrl = environment.apiUrl + 'api/ai';

  constructor(private http: HttpClient) { }

  generateParagraph(context: string, tone: string, characters: string): Promise<AIGenerationResponse> {
    const request: AIGenerationRequest = {
      type: 'paragraph',
      parameters: {
        context,
        tone,
        characters
      }
    };
    
    return firstValueFrom(this.http.post<AIGenerationResponse>(`${this.apiUrl}/generate`, request));
  }

  generateStats(gameSystemId: number, entityType: string, entityName: string, powerLevel: string): Promise<AIGenerationResponse> {
    const request: AIGenerationRequest = {
      type: 'stat',
      parameters: {
        gameSystemId: gameSystemId.toString(),
        entityType,
        entityName,
        powerLevel
      }
    };
    
    return firstValueFrom(this.http.post<AIGenerationResponse>(`${this.apiUrl}/generate`, request));
  }

  generateMusicDescription(scene: string, atmosphere: string): Promise<AIGenerationResponse> {
    const request: AIGenerationRequest = {
      type: 'music',
      parameters: {
        scene,
        atmosphere
      }
    };
    
    return firstValueFrom(this.http.post<AIGenerationResponse>(`${this.apiUrl}/generate`, request));
  }
}