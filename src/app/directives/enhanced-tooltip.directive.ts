import { Directive, Input, ElementRef, OnInit } from '@angular/core';

export type TooltipType = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'ai' | 'delete';
export type TooltipSize = 'small' | 'default' | 'large';

@Directive({
  selector: '[enhancedTooltip]',
  standalone: true
})
export class EnhancedTooltipDirective implements OnInit {
  @Input('enhancedTooltip') tooltipText!: string;
  @Input() tooltipType: TooltipType = 'default';
  @Input() tooltipSize: TooltipSize = 'default';
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';
  @Input() tooltipIcon?: string;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.setupTooltip();
  }

  private setupTooltip() {
    const element = this.el.nativeElement;
    
    // Ajouter les attributs de tooltip PrimeNG
    element.setAttribute('pTooltip', this.tooltipText);
    element.setAttribute('tooltipPosition', this.tooltipPosition);
    
    // Construire la classe de style
    const styleClasses = this.buildStyleClasses();
    if (styleClasses) {
      element.setAttribute('tooltipStyleClass', styleClasses);
    }

    // Ajouter l'icône si spécifiée
    if (this.tooltipIcon) {
      element.setAttribute('data-icon', this.tooltipIcon);
    }
  }

  private buildStyleClasses(): string {
    const classes: string[] = [];

    // Type de tooltip
    if (this.tooltipType !== 'default') {
      classes.push(`tooltip-${this.tooltipType}`);
    }

    // Taille du tooltip
    if (this.tooltipSize !== 'default') {
      classes.push(`tooltip-${this.tooltipSize}`);
    }

    // Icône
    if (this.tooltipIcon) {
      classes.push('tooltip-with-icon');
    }

    return classes.join(' ');
  }
}