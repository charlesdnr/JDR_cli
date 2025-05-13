import { Component, input } from '@angular/core';
import { MusicBlock } from '../../../classes/MusicBlock';
import { AudioplayerComponent } from '../../audioplayer/audioplayer.component';

@Component({
  selector: 'app-music-block',
  imports: [AudioplayerComponent],
  templateUrl: './music-block.component.html',
  styleUrl: './music-block.component.scss'
})
export class MusicBlockComponent {
  musicBlock = input.required<MusicBlock>();
  isReadOnly = input<boolean>(false);
}
