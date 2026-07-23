import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: appletConfig?.apiKey || "AIzaSyDqnrSSkaea_JG6xre3AD5dNfg1Ss4e7VU",
  authDomain: appletConfig?.authDomain || "sabush-bpt.firebaseapp.com",
  projectId: appletConfig?.projectId || "sabush-bpt",
  storageBucket: appletConfig?.storageBucket || "sabush-bpt.firebasestorage.app",
  messagingSenderId: appletConfig?.messagingSenderId || "143242763699",
  appId: appletConfig?.appId || "1:143242763699:web:93b9b3ef712449240f3fc6",
  measurementId: appletConfig?.measurementId || "G-5VYDEJ7RRV"
};

console.log('[Firebase Init] Config in use:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 8)}...` : undefined,
  firestoreDatabaseId: (firebaseConfig as any).firestoreDatabaseId
});

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = (firebaseConfig as any)?.firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

