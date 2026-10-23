import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
const app = firebaseConfigured ? initializeApp(config) : null
export const firebaseAuth = app ? getAuth(app) : null

export function getAuthErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'An account already exists for this email. Try signing in instead.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed': 'Could not reach Firebase. Check your internet connection and try again.',
    'auth/operation-not-allowed': 'Email and password sign-in is disabled. Enable it in Firebase Authentication settings.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/user-disabled': 'This account has been disabled. Contact your administrator.',
    'auth/user-not-found': 'No account was found for this email. Create an account first.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/wrong-password': 'The email or password is incorrect.',
  }
  return messages[error?.code] || error?.message || 'Authentication failed. Please try again.'
}

export async function initializeFirebaseAuth() {
  if (!firebaseAuth) return null
  await setPersistence(firebaseAuth, browserLocalPersistence)
  return firebaseAuth
}

export function subscribeToAuth(callback, onError) {
  if (!firebaseAuth) throw new Error('Firebase is not configured.')
  return onAuthStateChanged(firebaseAuth, callback, onError)
}

export function signInWithEmail(email, password) {
  if (!firebaseAuth) throw new Error('Firebase is not configured.')
  return signInWithEmailAndPassword(firebaseAuth, email, password)
}

export function createEmailAccount(email, password) {
  if (!firebaseAuth) throw new Error('Firebase is not configured.')
  return createUserWithEmailAndPassword(firebaseAuth, email, password)
}

export function signOutCurrentUser() {
  if (!firebaseAuth) throw new Error('Firebase is not configured.')
  return signOut(firebaseAuth)
}
