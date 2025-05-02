import { Component, input } from '@angular/core';
import { MusicBlock } from '../../../classes/MusicBlock';

@Component({
  selector: 'app-music-block',
  imports: [],
  templateUrl: './music-block.component.html',
  styleUrl: './music-block.component.scss'
})
export class MusicBlockComponent {
  musicBlock = input.required<MusicBlock>();
}
