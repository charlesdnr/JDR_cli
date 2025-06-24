import { Component, input } from '@angular/core';
import { StatBlock } from '../../../classes/StatBlock';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-stat-block',
  imports: [InputTextModule, TextareaModule, FormsModule, TranslateModule, InputNumberModule, TooltipModule],
  templateUrl: './stat-block.component.html',
  styleUrl: './stat-block.component.scss'
})
export class StatBlockComponent {
  statBlock = input.required<StatBlock>();
  isReadOnly = input<boolean>(false);
}
