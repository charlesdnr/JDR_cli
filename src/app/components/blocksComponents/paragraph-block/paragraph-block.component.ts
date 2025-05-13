import { AfterViewInit, Component, ElementRef, input, OnDestroy, output, viewChild } from '@angular/core';
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
    EditorModule
  ],
  templateUrl: './paragraph-block.component.html',
  styleUrl: './paragraph-block.component.scss'
})
export class ParagraphBlockComponent implements AfterViewInit, OnDestroy {
  paragraphBlock = input.required<ParagraphBlock>();
  isReadOnly = input<boolean>(false);

  // Correction des types des viewChild pour accéder correctement aux éléments
  titleInput = viewChild<ElementRef>('titleInput');
  paragraphEditor = viewChild<Editor>('paragraphEditor');

  cursorPositionChanged = output<{
    blockId: number,
    position: DOMRect,
    elementId: string,
    caretData?: {
      left: number,
      top: number,
    }
  }>();

  private caretPositionInterval = 0;

  options = [
    { label: 'Introduction', value: 'Introduction' },
    { label: 'Clarification', value: 'Clarification' },
    { label: 'Conclusion', value: 'Conclusion' }
  ];

  ngAfterViewInit() {
    // Délai pour s'assurer que les composants sont complètement initialisés
    setTimeout(() => {
      this.setupEventListeners();
      this.setupCaretTracking();
    }, 0);
  }

  private setupEventListeners() {
    if (this.isReadOnly()) return;

    // Pour l'input du titre
    if (this.titleInput()) {
      const titleElement = this.titleInput()?.nativeElement;
      titleElement.addEventListener('focus', this.onElementFocus.bind(this));
      titleElement.addEventListener('click', this.onElementFocus.bind(this));
      titleElement.addEventListener('keyup', this.onElementFocus.bind(this));
    }

    // Pour l'éditeur
    if (this.paragraphEditor()) {
      // Accéder à l'élément DOM de l'éditeur
      const editorElement = this.paragraphEditor()?.el.nativeElement.querySelector('.p-editor-content');
      if (editorElement) {
        editorElement.addEventListener('focus', this.onEditorFocus.bind(this));
        editorElement.addEventListener('click', this.onEditorFocus.bind(this));
        editorElement.addEventListener('keyup', this.onEditorFocus.bind(this));
      }
    }
  }

  private setupCaretTracking() {
    // Suivre la position du caret à intervalles réguliers
    if (!this.isReadOnly()) {
      this.caretPositionInterval = setInterval(() => {
        if (document.activeElement === this.paragraphEditor()?.el.nativeElement.querySelector('.ql-editor')) {
          this.trackCaretPosition();
        }
      }, 100); // Vérifier toutes les 100ms
    }
  }

  private trackCaretPosition() {

    // Obtenir la position absolue du conteneur de l'éditeur
    const editorContainer = this.paragraphEditor()?.el.nativeElement.querySelector('.p-editor-content');
    const editorRect = editorContainer.getBoundingClientRect();

    // Position absolue du caret
    const caretData = {
      left: editorRect.left,
      top: editorRect.top
    };

    this.emitCaretPosition(caretData);
  }

  onElementFocus(event: Event) {
    if (this.isReadOnly()) return;

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const elementId = target.id || 'title';

    // Pour les inputs normaux, utiliser la position du curseur du navigateur
    if (elementId === 'title') {
      const inputElement = target as HTMLInputElement;
      if (inputElement.selectionStart !== null) {
        // Estimer la position horizontale du caret en fonction du texte
        const textBeforeCursor = inputElement.value.substring(0, inputElement.selectionStart);
        const textWidth = this.getTextWidth(textBeforeCursor, window.getComputedStyle(inputElement).font);

        // Calculer la position exacte du caret
        const cursorLeft = rect.left + textWidth + 2; // +2 pour un petit décalage

        this.emitCaretPosition({
          left: cursorLeft,
          top: rect.top + rect.height / 2,
        });
      } else {
        this.cursorPositionChanged.emit({
          blockId: this.paragraphBlock().id || 0,
          position: rect,
          elementId: elementId
        });
      }
    }
  }

  onEditorFocus() {
    if (this.isReadOnly()) return;
    this.trackCaretPosition();
  }

  private emitCaretPosition(caretData: {left: number, top: number}) {
    // Créer un DOMRect pour la compatibilité avec l'API existante
    const dummyRect = new DOMRect(caretData.left, caretData.top, 2);

    this.cursorPositionChanged.emit({
      blockId: this.paragraphBlock().id || 0,
      position: dummyRect,
      elementId: 'editor',
      caretData: caretData
    });
  }

  // Utilitaire pour estimer la largeur du texte
  private getTextWidth(text: string, font: string) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = font;
      return context.measureText(text).width;
    }
    return 0;
  }

  ngOnDestroy() {
    if (this.caretPositionInterval) {
      clearInterval(this.caretPositionInterval);
    }
  }
}