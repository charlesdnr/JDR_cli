import {
  AfterViewInit,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ParagraphBlock } from '../../../classes/ParagraphBlock';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Editor, EditorModule } from 'primeng/editor';

@Component({
  selector: 'app-paragraph-block',
  imports: [
    FormsModule,
    TextareaModule,
    TranslateModule,
    InputTextModule,
    SelectModule,
    EditorModule,
  ],
  templateUrl: './paragraph-block.component.html',
  styleUrl: './paragraph-block.component.scss',
})
export class ParagraphBlockComponent {
  paragraphBlock = input.required<ParagraphBlock>();
  isReadOnly = input<boolean>(false);
  options = [
    { label: 'Introduction', value: 'Introduction' },
    { label: 'Clarification', value: 'Clarification' },
    { label: 'Conclusion', value: 'Conclusion' },
  ];
}
