const fs = require('fs');

// Créer le contenu du fichier environment.secret.ts
const envFileContent = `
export const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.FIREBASE_APP_ID}"
};
`;

// Écrire le fichier
fs.writeFileSync('./src/environments/environment.secret.ts', envFileContent);
console.log('Le fichier environment.secret.ts a été généré');