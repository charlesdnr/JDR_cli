import { Component, input } from '@angular/core';
import { StatBlock } from '../../../classes/StatBlock';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-stat-block',
  imports: [InputTextModule, FormsModule, TranslateModule, InputNumberModule],
  templateUrl: './stat-block.component.html',
  styleUrl: './stat-block.component.scss'
})
export class StatBlockComponent {
  statBlock = input.required<StatBlock>();
}
