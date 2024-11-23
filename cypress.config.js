const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Implémente les événements nécessaires si besoin
    },
    baseUrl: 'http://localhost:4200', // L'URL de ton application Angular
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}', // Emplacement des fichiers de test
  },
});
