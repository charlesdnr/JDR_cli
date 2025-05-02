import { Component, input, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ParagraphBlock } from '../../../classes/ParagraphBlock';

@Component({
  selector: 'app-paragraph-block',
  imports: [
    FormsModule,
    TextareaModule
  ],
  templateUrl: './paragraph-block.component.html',
  styleUrl: './paragraph-block.component.scss'
})
export class ParagraphBlockComponent implements OnInit {
  paragraphBlock = input.required<ParagraphBlock>();
  content = model<string>('');

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
