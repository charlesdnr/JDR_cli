import { Component, input } from '@angular/core';
import { StatBlock } from '../../../classes/StatBlock';

@Component({
  selector: 'app-stat-block',
  imports: [],
  templateUrl: './stat-block.component.html',
  styleUrl: './stat-block.component.scss'
})
export class StatBlockComponent {
  statBlock = input.required<StatBlock>();
}
