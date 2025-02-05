import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  // On récupère la valeur du mot de passe et de la confirmation
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirm')?.value;

  // Si les champs sont remplis et différents, on retourne une erreur
  if (password && confirmPassword && password !== confirmPassword) {
    // On marque spécifiquement le champ de confirmation comme invalide
    control.get('confirm')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }

  // Si la validation passe, on s'assure de nettoyer l'erreur sur le champ de confirmation
  if (control.get('confirm')?.hasError('passwordMismatch')) {
    control.get('confirm')?.setErrors(null);
  }

  return null;
}
