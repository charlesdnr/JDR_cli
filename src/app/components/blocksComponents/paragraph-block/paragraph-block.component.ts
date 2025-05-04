import { Component, input, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ParagraphBlock } from '../../../classes/ParagraphBlock';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-paragraph-block',
  imports: [
    FormsModule,
    TextareaModule,
    TranslateModule,
    InputTextModule,
    SelectModule
  ],
  templateUrl: './paragraph-block.component.html',
  styleUrl: './paragraph-block.component.scss'
})
export class ParagraphBlockComponent implements OnInit {
  paragraphBlock = input.required<ParagraphBlock>();
  content = model<string>('');

  options = ["Introduction", ""]

  ngOnInit() {
    if (this.paragraphBlock().paragraph) {
      this.content.set(this.paragraphBlock().paragraph ?? '');
    }
  }

  onContentChange(value: string) {
    if (this.paragraphBlock()) {
      this.paragraphBlock().paragraph = value;
    }
  }
}
