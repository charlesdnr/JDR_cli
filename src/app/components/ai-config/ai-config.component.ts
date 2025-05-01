import { Component, inject, input, OnInit, signal } from '@angular/core';
import { EBlockType } from '../../enum/BlockType';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TextareaModule } from 'primeng/textarea';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { SelectModule } from 'primeng/select';
import { AIGenerationService } from '../../services/https/AIGeneration.service';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { GameSystemService } from '../../services/https/GameSystemService.service';
import { EditorModule } from 'primeng/editor';

@Component({
  selector: 'app-ai-config',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    TextareaModule,
    LottieComponent,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    DropdownModule,
    SelectModule,
    BadgeModule,
    TooltipModule,
    EditorModule
  ],
  templateUrl: './ai-config.component.html',
  styleUrl: './ai-config.component.scss',
})
export class AiConfigComponent implements OnInit {
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);
  private AIService = inject(AIGenerationService);
  private messageService = inject(MessageService);
  private gameSystemService = inject(GameSystemService);

  type = input<EBlockType>(EBlockType.paragraph);
  generatingMessage = signal<string>('Génération en cours...');
  gameSystems = signal<any[]>([]);

  // Messages aléatoires pour l'animation de génération
  private generationMessages = [
    'Exploration des royaumes créatifs...',
    'Tissage d\'histoires épiques...',
    'Création de mondes extraordinaires...',
    'Invocation de personnages mémorables...',
    'Forgeage d\'aventures légendaires...',
    'Distillation d\'idées brillantes...',
    'Harmonisation des éléments narratifs...'
  ];

  // Formulaire pour les paragraphes
  formgroupParaph = new FormGroup({
    context: new FormControl('', Validators.required),
    tone: new FormControl(''),
    characters: new FormControl(''),
    gameSystem: new FormControl('fantasy'),
  });

  // Formulaire pour les musiques
  formgroupMusic = new FormGroup({
    scene: new FormControl('', Validators.required),
    atmosphere: new FormControl(''),
  });

  // Formulaire pour les statistiques
  formgroupStat = new FormGroup({
    entityType: new FormControl('', Validators.required),
    entityName: new FormControl(''),
    powerLevel: new FormControl('moyen'),
    gameSystemId: new FormControl('1'),
  });

  // Formulaire pour la génération complète de module
  formgroupCompleteModule = new FormGroup({
    theme: new FormControl('', Validators.required),
    title: new FormControl('', Validators.required),
    description: new FormControl(''),
    gameSystemId: new FormControl('1'),
  });

  // Placeholders
  contextPlaceHolder = 'Une ancienne cité naine abandonnée...';
  tonePlaceHolder = "Mystérieux et oppressant...";
  charactersPlaceHolder = "Un groupe d'aventuriers découvrant les lieux pour la première fois...";

  // Music placeholders
  scenePlaceHolder = "Une taverne animée...";
  atmospherePlaceHolder = "Joyeuse et festive...";

  // Stat placeholders
  entityTypePlaceHolder = "Gobelin, Orc, Dragon...";
  entityNamePlaceHolder = "Grommash, Azuregos...";
  powerLevels = [
    { name: 'Faible', value: 'faible' },
    { name: 'Moyen', value: 'moyen' },
    { name: 'Élevé', value: 'élevé' },
    { name: 'Légendaire', value: 'légendaire' }
  ];

  // Lottie animation options
  options: AnimationOptions = {
    path: 'assets/lottie/loading-ai.json',
  };

  loading = signal(false);
  response = signal('');

  EBlockType = EBlockType;
  successAnimation = signal(false);
  successOptions: AnimationOptions = {
    path: 'assets/lottie/success.json', // You'll need to add this animation file
  };

  async ngOnInit() {
    // Charge les systèmes de jeu pour le dropdown
    try {
      const systems = await this.gameSystemService.getAllGameSystems();
      this.gameSystems.set(systems.map((system: any) => ({
        name: system.name,
        id: system.id.toString()
      })));

      // Pré-sélectionne le premier système
      if (systems.length > 0) {
        this.formgroupCompleteModule.get('gameSystemId')?.setValue(systems[0].id.toString());
        this.formgroupStat.get('gameSystemId')?.setValue(systems[0].id.toString());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des systèmes de jeu:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de charger les systèmes de jeu.'
      });
    }
  }

  generate() {
    this.loading.set(true);
    this.startGenerationAnimation();

    switch (this.type()) {
      case EBlockType.paragraph:
        this.AIService.generateParagraph(
          this.formgroupParaph.value.context || '',
          this.formgroupParaph.value.tone || '',
          this.formgroupParaph.value.characters || '',
          this.formgroupParaph.value.gameSystem || 'fantasy'
        )
          .then(resp => {
            this.handleSuccessResponse('paragraphe', resp.content);
          })
          .catch(error => {
            this.handleErrorResponse('paragraphe', error);
          });
        break;

      case EBlockType.music:
        this.AIService.generateMusicBlock(
          this.formgroupMusic.value.scene || '',
          this.formgroupMusic.value.atmosphere || ''
        )
          .then(resp => {
            // Format en JSON pour maintenir la structure
            const musicData = {
              label: `Musique pour ${this.formgroupMusic.value.scene}`,
              description: resp.content,
              src: ""
            };
            this.handleSuccessResponse('musique', JSON.stringify(musicData, null, 2));
          })
          .catch(error => {
            this.handleErrorResponse('musique', error);
          });
        break;

      case EBlockType.stat:
        this.AIService.generateStatBlock(
          this.formgroupStat.value.entityType || '',
          this.formgroupStat.value.entityName || '',
          this.formgroupStat.value.powerLevel || 'moyen',
          this.getGameSystemName(this.formgroupStat.value.gameSystemId || '1'),
          this.formgroupStat.value.gameSystemId || '1'
        )
          .then(resp => {
            const statData = {
              statRules: '',
              statValues: resp.content
            };
            this.handleSuccessResponse('statistiques', JSON.stringify(statData, null, 2));
          })
          .catch(error => {
            this.handleErrorResponse('statistiques', error);
          });
        break;

      default:
        this.loading.set(false);
        this.response.set('Type de bloc non supporté');
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Type de bloc non supporté'
        });
        break;
    }
  }

  generateCompleteModule() {
    this.loading.set(true);
    this.AIService.generateCompleteModule(
      this.formgroupCompleteModule.value.theme || '',
      this.formgroupCompleteModule.value.title || '',
      this.formgroupCompleteModule.value.description || '',
      this.formgroupCompleteModule.value.gameSystemId || '1'
    )
      .then(resp => {
        console.log('Réponse module complet:', resp);
        this.response.set(JSON.stringify(resp));

        // Show success animation
        this.loading.set(false);
        this.successAnimation.set(true);

        // Close after a short delay
        setTimeout(() => {
          this.ref.close(this.response());
        }, 1200);
      })
      .catch(error => {
        console.error('Erreur lors de la génération du module complet:', error);
        this.response.set('Erreur lors de la génération. Veuillez réessayer.');
        this.loading.set(false);
      });
  }

  // Méthodes utilitaires
  private startGenerationAnimation() {
    // Change périodiquement le message pendant la génération
    const interval = setInterval(() => {
      if (this.loading()) {
        const randomIndex = Math.floor(Math.random() * this.generationMessages.length);
        this.generatingMessage.set(this.generationMessages[randomIndex]);
      } else {
        clearInterval(interval);
      }
    }, 3000);
  }

  private handleSuccessResponse(type: string, content: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Génération réussie',
      detail: `Le ${type} a été généré avec succès!`
    });
    this.response.set(content);
    this.loading.set(false);
  }

  private handleErrorResponse(type: string, error: any) {
    console.error(`Erreur lors de la génération du ${type}:`, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: `Impossible de générer le ${type}. Veuillez réessayer.`
    });
    this.response.set(`Erreur lors de la génération. Veuillez réessayer.`);
    this.loading.set(false);
  }

  private getGameSystemName(id: string): string {
    const system = this.gameSystems().find(sys => sys.id === id);
    return system ? system.name : 'Système inconnu';
  }
}