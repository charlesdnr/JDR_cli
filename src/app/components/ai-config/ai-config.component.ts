import { Component, inject, input, signal } from '@angular/core';
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
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { SelectModule } from 'primeng/select';
import { AIGenerationService } from '../../services/https/AIGeneration.service';
import { InputTextModule } from 'primeng/inputtext';

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
    SelectModule
  ],
  templateUrl: './ai-config.component.html',
  styleUrl: './ai-config.component.scss',
})
export class AiConfigComponent {
  ref = inject(DynamicDialogRef);

  type = input<EBlockType>(EBlockType.paragraph);
  private AIService = inject(AIGenerationService);

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

  EBlockType = EBlockType

  generate() {
    this.loading.set(true);
    
    switch (this.type()) {
      case EBlockType.paragraph:
        this.AIService.generateParagraph(
          this.formgroupParaph.value.context || '',
          this.formgroupParaph.value.tone || '',
          this.formgroupParaph.value.characters || '',
          this.formgroupParaph.value.gameSystem || 'fantasy'
        )
        .then(resp => {
          console.log('Réponse IA paragraphe:', resp);
          this.response.set(resp.content);
        })
        .catch(error => {
          console.error('Erreur lors de la génération du paragraphe:', error);
          this.response.set('Erreur lors de la génération. Veuillez réessayer.');
        })
        .finally(() => this.loading.set(false));
        break;

      case EBlockType.music:
        this.AIService.generateMusicBlock(
          this.formgroupMusic.value.scene || '',
          this.formgroupMusic.value.atmosphere || ''
        )
        .then(resp => {
          console.log('Réponse IA musique:', resp);
          // La réponse est une description textuelle, on peut l'utiliser comme description
          // et générer un label basé sur la scène
          this.response.set(JSON.stringify({
            label: `Musique pour ${this.formgroupMusic.value.scene}`,
            description: resp.content,
            src: ""
          }));
        })
        .catch(error => {
          console.error('Erreur lors de la génération de la musique:', error);
          this.response.set('Erreur lors de la génération. Veuillez réessayer.');
        })
        .finally(() => this.loading.set(false));
        break;

      case EBlockType.stat:
        this.AIService.generateStatBlock(
          this.formgroupStat.value.entityType || '',
          this.formgroupStat.value.entityName || '',
          this.formgroupStat.value.powerLevel || 'moyen',
          'Donjon et Dragon',
          this.formgroupStat.value.gameSystemId || '1'
        )
        .then(resp => {
          console.log('Réponse IA stats:', resp);
          this.response.set(JSON.stringify({
            statRules: '',
            statValues: resp.content
          }));
        })
        .catch(error => {
          console.error('Erreur lors de la génération des stats:', error);
          this.response.set('Erreur lors de la génération. Veuillez réessayer.');
        })
        .finally(() => this.loading.set(false));
        break;

      default:
        this.loading.set(false);
        this.response.set('Type de bloc non supporté');
        break;
    }
  }

  // Génère un module complet
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
    })
    .catch(error => {
      console.error('Erreur lors de la génération du module complet:', error);
      this.response.set('Erreur lors de la génération. Veuillez réessayer.');
    })
    .finally(() => this.loading.set(false));
  }
}