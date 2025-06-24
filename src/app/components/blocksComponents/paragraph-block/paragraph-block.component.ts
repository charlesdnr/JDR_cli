import {
  Component,
  input,
  ViewChild,
  AfterViewInit,
  effect,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { ParagraphBlock } from '../../../classes/ParagraphBlock';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { SelectChangeEvent, SelectModule } from 'primeng/select';
import { EditorModule } from 'primeng/editor';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { trigger, transition, style, animate } from '@angular/animations';
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
    ButtonModule,
    CardModule,
    TooltipModule,
    BadgeModule,
    RippleModule,
    DividerModule
  ],
  templateUrl: './paragraph-block.component.html',
  styleUrl: './paragraph-block.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: '0', overflow: 'hidden' }),
        animate('250ms ease-out', style({ height: '*' }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ height: '0', overflow: 'hidden' }))
      ])
    ])
  ]
})
export class ParagraphBlockComponent implements AfterViewInit {
  paragraphBlock = input.required<ParagraphBlock>();
  isReadOnly = input<boolean>(false);
  showAdvanced = input<boolean>(false);
  
  // Signals pour la gestion d'état
  isExpanded = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  characterCount = signal<number>(0);
  wordCount = signal<number>(0);
  selectedStyle = signal<string>('');
  currentContent = signal<string>('');
  
  // Options de style améliorées avec icônes
  options = [
    { 
      label: 'Introduction', 
      value: 'Introduction',
      icon: 'pi pi-flag',
      description: 'Début de section ou chapitre'
    },
    { 
      label: 'Clarification', 
      value: 'Clarification',
      icon: 'pi pi-info-circle',
      description: 'Explication ou précision'
    },
    { 
      label: 'Conclusion', 
      value: 'Conclusion',
      icon: 'pi pi-check',
      description: 'Fin de section'
    },
    { 
      label: 'Important', 
      value: 'Important',
      icon: 'pi pi-exclamation-triangle',
      description: 'Information critique'
    },
    { 
      label: 'Note', 
      value: 'Note',
      icon: 'pi pi-bookmark',
      description: 'Remarque ou annotation'
    }
  ];
  
  // Computed properties
  selectedStyleInfo = computed(() => {
    const style = this.selectedStyle() || this.paragraphBlock().style;
    return this.options.find(opt => opt.value === style) || this.options[0];
  });
  
  blockStats = computed(() => {
    const content = this.paragraphBlock().paragraph || '';
    const textContent = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    const chars = textContent.length;
    const words = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    
    return {
      characters: chars,
      words: words,
      readingTime: Math.ceil(words / 200) // ~200 words per minute
    };
  });
  
  // Effect pour mettre à jour les signals de comptage
  private updateStatsEffect = effect(() => {
    const stats = this.blockStats();
    this.characterCount.set(stats.characters);
    this.wordCount.set(stats.words);
  });


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
    
    // Initialiser le style sélectionné
    effect(() => {
      const block = this.paragraphBlock();
      if (block && !this.selectedStyle()) {
        this.selectedStyle.set(block.style || '');
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
  
  // Méthodes pour l'interface
  toggleExpand(): void {
    this.isExpanded.set(!this.isExpanded());
  }
  
  startEditing(): void {
    if (!this.isReadOnly()) {
      this.isEditing.set(true);
    }
  }
  
  stopEditing(): void {
    this.isEditing.set(false);
  }
  
  getStyleIcon(): string {
    return this.selectedStyleInfo().icon;
  }
  
  getStyleColor(): 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const style = this.paragraphBlock().style;
    switch (style) {
      case 'Introduction': return 'info';
      case 'Important': return 'danger';
      case 'Conclusion': return 'success';
      case 'Note': return 'warn';
      default: return 'secondary';
    }
  }
  
  onTitleFocus(): void {
    this.startEditing();
  }
  
  onTitleBlur(): void {
    setTimeout(() => this.stopEditing(), 100);
  }
  
  copyContent(): void {
    const content = this.paragraphBlock().paragraph || '';
    const textContent = content.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(textContent);
  }
  
  onStyleChange(event: SelectChangeEvent): void {
    // Mettre à jour le signal local ET le paragraphBlock
    if (event.value) {
      this.selectedStyle.set(event.value);
      this.paragraphBlock().style = event.value;
    }
  }
}
