module.exports = function (config) {
    config.set({
      frameworks: ['jasmine', '@angular-devkit/build-angular'],
      plugins: [
        require('karma-jasmine'),
        require('karma-chrome-launcher'),
        require('karma-jasmine-html-reporter'),
        require('karma-coverage'),
        require('@angular-devkit/build-angular/plugins/karma'),
      ],
      client: {
        clearContext: false, // Laisser Jasmine afficher les résultats
      },
      reporters: ['progress', 'coverage'], // Progression et rapport de couverture
      coverageReporter: {
        dir: require('path').join(__dirname, './coverage'),
        subdir: '.',
        reporters: [
          { type: 'html' }, // Générer des rapports HTML
          { type: 'lcovonly' }, // Rapport LCOV pour les outils comme SonarQube
          { type: 'text-summary' }, // Résumé texte
        ],
      },
      port: 9876,
      colors: true,
      logLevel: config.LOG_INFO,
      autoWatch: false,
      browsers: ['ChromeHeadlessCI'],
      customLaunchers: {
        ChromeHeadlessCI: {
          base: 'ChromeHeadless',
          flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        },
      },
      singleRun: true, // Assurer que Karma quitte après l'exécution
    });
  };
  