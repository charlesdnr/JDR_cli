import {
  Component,
  input,
  ViewChild,
  AfterViewInit,
  effect,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ParagraphBlock } from '../../../classes/ParagraphBlock';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { EditorModule } from 'primeng/editor';
import { sanitizeAIGeneratedHTML } from '../../../utils/cleanBlocksForSave';

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
export class ParagraphBlockComponent implements AfterViewInit {
  paragraphBlock = input.required<ParagraphBlock>();
  isReadOnly = input<boolean>(false);
  options = [
    { label: 'Introduction', value: 'Introduction' },
    { label: 'Clarification', value: 'Clarification' },
    { label: 'Conclusion', value: 'Conclusion' },
  ];

  // Formats supportés par l'éditeur (correspondant aux balises AI)
  editorFormats = [
    'bold', 'italic', 'underline', 
    'header', 'list', 'bullet', 'ordered'
  ];

  @ViewChild('paragraphEditor') paragraphEditor!: unknown;
  
  // Signal pour forcer la mise à jour de l'éditeur
  editorContent = signal<string>('');

  constructor() {
    // Effect pour surveiller les changements du contenu du paragraphe
    effect(() => {
      const block = this.paragraphBlock();
      if (block && block.paragraph !== this.editorContent()) {
        // Sanitiser le contenu HTML avant de l'afficher
        const sanitizedContent = sanitizeAIGeneratedHTML(block.paragraph || '');
        this.editorContent.set(sanitizedContent);
        this.updateEditorWithDelay();
      }
    });
  }

  ngAfterViewInit() {
    // Initialiser le contenu de l'éditeur après sa création
    setTimeout(() => {
      this.updateEditorContent();
    }, 100);
  }

  private updateEditorWithDelay() {
    // Attendre que l'éditeur soit prêt avant de mettre à jour
    setTimeout(() => {
      this.updateEditorContent();
    }, 50);
  }

  private updateEditorContent() {
    const editor = this.paragraphEditor as { getQuill?: () => unknown };
    if (editor && editor.getQuill) {
      const quill = editor.getQuill() as { 
        root: { innerHTML: string };
        getSelection: () => unknown;
        setSelection: (selection: unknown) => void;
      };
      if (quill && quill.root) {
        const currentContent = quill.root.innerHTML;
        const newContent = this.editorContent();
        
        // Mettre à jour seulement si le contenu a changé
        if (currentContent !== newContent && newContent) {
          // Sauvegarder la position du curseur
          const selection = quill.getSelection();
          
          // Mettre à jour le contenu
          quill.root.innerHTML = newContent;
          
          // Restaurer la position du curseur si possible
          if (selection) {
            try {
              quill.setSelection(selection);
            } catch {
              // Ignorer les erreurs de sélection
            }
          }
        }
      }
    }
  }

  // Gestionnaire d'événements pour les changements dans l'éditeur
  onTextChange(event: { htmlValue?: string }) {
    // Mettre à jour le signal avec le nouveau contenu
    if (event.htmlValue !== undefined) {
      this.editorContent.set(event.htmlValue);
      // Mettre à jour le bloc directement
      const block = this.paragraphBlock();
      if (block) {
        block.paragraph = event.htmlValue;
      }
    }
  }

  // Méthode pour obtenir le contenu sanitisé en mode lecture seule
  getSanitizedContent(): string {
    return sanitizeAIGeneratedHTML(this.paragraphBlock().paragraph || '');
  }
}
