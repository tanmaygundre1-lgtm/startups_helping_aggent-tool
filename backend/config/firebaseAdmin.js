const dotenv = require('dotenv');
const {
  cert,
  getApps,
  initializeApp,
} = require('firebase-admin/app');

dotenv.config();

const requiredEnvironmentVariables = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (variableName) => !process.env[variableName],
);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingEnvironmentVariables.join(', ')}`,
  );
}

const firebaseAdminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

module.exports = firebaseAdminApp;
