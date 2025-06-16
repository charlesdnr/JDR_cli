describe('Navigation', () => {
    it('should navigate to the home page', () => {
      cy.visit('/home');
      cy.contains('Bienvenue!').should('be.visible'); // Vérifie que le texte "Bienvenue" est visible
    });
});