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
import { AIGenerationService } from '../../services/https/AIGenerationService-http.service';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-ai-config',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    TextareaModule,
    LottieComponent,
    ButtonModule
  ],
  templateUrl: './ai-config.component.html',
  styleUrl: './ai-config.component.scss',
})
export class AiConfigComponent {
  ref = inject(DynamicDialogRef);

  type = input<EBlockType>(EBlockType.paragraph);
  private AIService = inject(AIGenerationService);

  formgroupParaph = new FormGroup({
    contexte: new FormControl('', Validators.required),
    tone: new FormControl(''),
    characters: new FormControl(''),
  });

  contextPlaceHolder =
    'Une ancienne cité naine abandonnée...';
  tonePlaceHolder =
    "Mystérieux et oppressant...";
  charactersPlaceHolder =
    "Un groupe d'aventuriers découvrant les lieux pour la première fois...";

  options: AnimationOptions = {
    path: 'assets/lottie/loading-ai.json',
  };

  loading = signal(false);
  response = signal('');

  generate() {
    console.log(this.formgroupParaph.value)
    switch (this.type()) {
      case EBlockType.paragraph:
        this.loading.set(true);
        this.AIService.generateParagraph(
          this.formgroupParaph.value.contexte ?? '',
          this.formgroupParaph.value.tone ?? '',
          this.formgroupParaph.value.characters ?? ''
        )
        .then(resp => {
          console.log(resp)
          this.response.set(resp.content)
        })
        .finally(() => this.loading.set(false));
        break;
    }
  }
}
