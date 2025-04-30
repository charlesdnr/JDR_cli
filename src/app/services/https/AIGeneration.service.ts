import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EBlockType } from '../../enum/BlockType';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AIGenerationService {
  private httpClient = inject(HttpClient);
  private baseApiUrl = environment.apiUrl + 'api/ai';

  /**
   * Génère un contenu basé sur le type de bloc et les paramètres spécifiés
   */
  generateContent(type: EBlockType, parameters: Record<string, string>): Promise<any> {
    return firstValueFrom(
      this.httpClient.post(`${this.baseApiUrl}/generate`, {
        type,
        parameters
      })
    );
  }

  /**
   * Génère un paragraphe à partir du contexte, ton et personnages fournis
   */
  generateParagraph(
    context: string,
    tone: string = '',
    characters: string = '',
    gameSystem: string = 'fantasy'
  ): Promise<any> {
    return this.generateContent(EBlockType.paragraph, {
      context,
      tone,
      characters,
      gameSystem
    });
  }

  /**
   * Génère des informations pour un bloc de musique
   */
  generateMusicBlock(
    scene: string,
    atmosphere: string = ''
  ): Promise<any> {
    return this.generateContent(EBlockType.music, {
      scene,
      atmosphere
    });
  }

  /**
   * Génère des statistiques pour un bloc stat
   */
  generateStatBlock(
    entityType: string,
    entityName: string = '',
    powerLevel: string = 'moyen',
    gameSystem: string = 'Donjon et Dragon',
    gameSystemId: string = '1'
  ): Promise<any> {
    return this.generateContent(EBlockType.stat, {
      entityType,
      entityName,
      powerLevel,
      gameSystem,
      gameSystemId
    });
  }

  /**
   * Génère un module complet avec plusieurs blocs
   * Cette méthode utilise maintenant l'endpoint dédié pour la génération de module
   */
  generateCompleteModule(
    theme: string,
    title: string,
    description: string,
    gameSystemId: string = '1',
    userId: number = 1
  ): Promise<any> {
    return firstValueFrom(
      this.httpClient.post(`${this.baseApiUrl}/generate-module`, {
        theme,
        title,
        description,
        gameSystemId,
        userId
      })
    );
  }
}