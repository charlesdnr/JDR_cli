import { Block } from '../classes/Block';
import { ModuleVersion } from '../classes/ModuleVersion';
import { Module } from '../classes/Module';

/**
 * Nettoie les IDs temporaires des blocs avant l'envoi au serveur.
 * Les blocs avec des IDs temporaires (non-entiers ou très grands) 
 * verront leur ID supprimé pour être traités comme de nouveaux blocs.
 */
export function cleanBlocksForSave(block: Block): Block {
  // Créer une copie du bloc pour éviter de modifier l'original
  const cleanedBlock = { ...block };
  
  // Si l'ID est temporaire (contient des décimales ou est très grand), le supprimer
  if (cleanedBlock.id !== undefined) {
    // Les IDs temporaires sont générés avec Date.now() + Math.random()
    // Ils sont donc très grands et peuvent avoir des décimales
    if (!Number.isInteger(cleanedBlock.id) || cleanedBlock.id > 2147483647) {
      delete cleanedBlock.id;
    }
  }
  
  return cleanedBlock;
}

/**
 * Valide et nettoie le contenu HTML généré par l'IA selon les balises autorisées
 */
export function sanitizeAIGeneratedHTML(html: string): string {
  if (!html) return '';
  
  // Balises autorisées par l'IA générative
  const allowedTags = [
    'p', 'br', 'h1', 'h2', 'h3', 'h4', 
    'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'
  ];
  
  // Créer un élément temporaire pour parser le HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Supprimer les scripts et autres éléments dangereux
  const dangerousElements = tempDiv.querySelectorAll('script, style, object, embed, iframe, form, input');
  dangerousElements.forEach(element => element.remove());
  
  // Nettoyer les attributs non autorisés (garder seulement href pour les liens)
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(element => {
    const tagName = element.tagName.toLowerCase();
    
    // Supprimer la balise si elle n'est pas autorisée
    if (!allowedTags.includes(tagName)) {
      // Remplacer par son contenu textuel
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }
    
    // Nettoyer les attributs
    const attributes = Array.from(element.attributes);
    attributes.forEach(attr => {
      // Garder seulement href pour les liens
      if (tagName === 'a' && attr.name === 'href') {
        // Valider que l'URL est sûre (http/https)
        const href = attr.value;
        if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')) {
          element.removeAttribute(attr.name);
        }
      } else {
        // Supprimer tous les autres attributs (style, class, id, etc.)
        element.removeAttribute(attr.name);
      }
    });
  });
  
  return tempDiv.innerHTML;
}

/**
 * Nettoie tous les blocs d'une version de module
 */
export function cleanModuleVersionForSave(moduleVersion: ModuleVersion): ModuleVersion {
  const cleanedVersion = { ...moduleVersion };
  
  if (cleanedVersion.blocks) {
    cleanedVersion.blocks = cleanedVersion.blocks.map(block => cleanBlocksForSave(block));
  }
  
  return cleanedVersion;
}

/**
 * Nettoie tous les blocs de toutes les versions d'un module
 */
export function cleanModuleForSave(module: Module): Module {
  const cleanedModule = { ...module };
  
  if (cleanedModule.versions) {
    cleanedModule.versions = cleanedModule.versions.map(version => 
      cleanModuleVersionForSave(version)
    );
  }
  
  return cleanedModule;
}