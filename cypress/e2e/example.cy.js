describe('Navigation', () => {
    it('should navigate to the home page', () => {
      cy.visit('/');
      cy.contains('Congratulations!').should('be.visible'); // Vérifie que le texte "Welcome" est visible
    });
});