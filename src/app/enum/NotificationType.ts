export enum NotificationType {
    MODULE_SHARED,   // Quand un module est partagé
    MODULE_COMMENT,  // Quand un module reçoit un commentaire
    MODULE_LIKE,     // Quand un module est liké
    REVIEW_ADDED,    // Quand un avis est ajouté
    MENTION,          // Quand un utilisateur est mentionné
    ACCESS_RIGHTS_CHANGED,  // Quand les droits d'accès sont modifiés
    ACCESS_RIGHTS_REMOVED   // Quand l'accès est retiré
}