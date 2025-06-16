import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EBlockType } from '../../enum/BlockType';
import { environment } from '../../../environments/environment';
import { MessageService } from 'primeng/api';

interface AIGenerationResponse {
  content: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIGenerationService {
  private httpClient = inject(HttpClient);
  private messageService = inject(MessageService);
  private baseApiUrl = environment.apiUrl + 'api/ai';

  /**
   * Génère un contenu basé sur le type de bloc et les paramètres spécifiés
   * avec gestion d'erreur améliorée
   */
  async generateContent(type: EBlockType, parameters: Record<string, string>): Promise<AIGenerationResponse> {
    try {
      return await firstValueFrom(
        this.httpClient.post<AIGenerationResponse>(`${this.baseApiUrl}/generate`, {
          type,
          parameters
        })
      );
    } catch (error) {
      console.error(`Erreur lors de la génération de contenu de type ${type}:`, error);
      this.handleError(error as HttpErrorResponse, `Erreur de génération pour ${type}`);
      throw error;
    }
  }

  /**
   * Génère un paragraphe à partir du contexte, ton et personnages fournis
   */
  async generateParagraph(
    context: string,
    tone: string,
    characters: string,
    gameSystemId: string
  ): Promise<AIGenerationResponse> {
    return this.generateContent(EBlockType.paragraph, {
      context,
      tone,
      characters,
      gameSystemId
    });
  }

  /**
   * Génère des informations pour un bloc de musique
   */
  async generateMusicBlock(
    scene: string,
    atmosphere = ''
  ): Promise<AIGenerationResponse> {
    return this.generateContent(EBlockType.music, {
      scene,
      atmosphere
    });
  }

  /**
   * Génère des statistiques pour un bloc stat
   */
  async generateStatBlock(
    entityType: string,
    entityName = '',
    powerLevel = 'moyen',
    gameSystem = 'Donjon et Dragon',
    gameSystemId = '1'
  ): Promise<AIGenerationResponse> {
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
   * Version améliorée avec gestion d'erreur
   */
  async generateCompleteModule(
    theme: string,
    title: string,
    description: string,
    gameSystemId = '1',
    userId = 1
  ): Promise<Map<string, unknown>> {
    try {
      // Afficher une notification pour indiquer que la génération est en cours
      this.messageService.add({
        severity: 'info',
        summary: 'Génération en cours',
        detail: 'Création du module complet...',
        key: 'module-generation',
        sticky: true
      });

      const response = await firstValueFrom(
        this.httpClient.post<Map<string, unknown>>(`${this.baseApiUrl}/generate-module`, {
          theme,
          title,
          description,
          gameSystemId,
          userId
        })
      );

      // Supprimer la notification de chargement
      this.messageService.clear('module-generation');
      return response;
    } catch (error: unknown) {
      // Supprimer la notification de chargement
      this.messageService.clear('module-generation');
      this.handleError(error as HttpErrorResponse, 'Erreur de génération de module');
      throw error;
    }
  }

  /**
   * Gestion générique des erreurs
   */
  private handleError(error: HttpErrorResponse, defaultMessage: string): void {
    console.error(defaultMessage, error);

    let errorMessage = defaultMessage;

    // Extraire le message d'erreur détaillé si possible
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Afficher un toast d'erreur
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: errorMessage,
      life: 5000
    });
  }
}
