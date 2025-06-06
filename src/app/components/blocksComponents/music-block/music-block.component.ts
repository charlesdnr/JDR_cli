import { Component, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TranslateModule } from '@ngx-translate/core';
import { MusicBlock } from '../../../classes/MusicBlock';
import { AudioplayerComponent } from '../../audioplayer/audioplayer.component';

@Component({
  selector: 'app-music-block',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    TranslateModule,
    AudioplayerComponent,
  ],
  templateUrl: './music-block.component.html',
  styleUrl: './music-block.component.scss'
})
export class MusicBlockComponent {
  musicBlock = model.required<MusicBlock>();
  isReadOnly = input<boolean>(false);

  onAudioUploaded(fileId: string) {
    this.musicBlock.update((block) => {
      block.src = fileId;
      return block;
    });
  }

  onAudioRemoved() {
    this.musicBlock.update((block) => {
      block.src = '';
      return block;
    });
  }
}
