import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createEmailAccount,
  firebaseConfigured,
  getAuthErrorMessage,
  initializeFirebaseAuth,
  signInWithEmail,
  signOutCurrentUser,
  subscribeToAuth,
} from '../services/firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const authReady = ref(false)
  const authError = ref('')
  const isAuthenticated = computed(() => Boolean(user.value))
  let initialized = false

  function cachedRole(uid) {
    return sessionStorage.getItem(`niryaatx-role:${uid}`) || 'Exporter'
  }

  function setUser(firebaseUser) {
    user.value = firebaseUser
      ? { uid: firebaseUser.uid, email: firebaseUser.email, role: cachedRole(firebaseUser.uid) }
      : null
  }

  function setRole(role) {
    if (!user.value) return
    sessionStorage.setItem(`niryaatx-role:${user.value.uid}`, role)
    user.value = { ...user.value, role }
  }

  async function initialize() {
    if (initialized) return
    initialized = true
    if (!firebaseConfigured) {
      authError.value = 'Firebase is not configured. Add the Firebase web app values to your local .env file.'
      authReady.value = true
      return
    }
    try {
      await initializeFirebaseAuth()
      await new Promise((resolve) => {
        let firstState = true
        subscribeToAuth((firebaseUser) => {
          setUser(firebaseUser)
          authReady.value = true
          if (firstState) {
            firstState = false
            resolve()
          }
        }, (error) => {
          authError.value = getAuthErrorMessage(error)
          authReady.value = true
          if (firstState) {
            firstState = false
            resolve()
          }
        })
      })
    } catch (error) {
      authError.value = getAuthErrorMessage(error)
      authReady.value = true
    }
  }

  async function signIn(email, password, role) {
    const result = await signInWithEmail(email, password)
    setUser(result.user)
    setRole(role)
  }

  async function createAccount(email, password, role) {
    const result = await createEmailAccount(email, password)
    setUser(result.user)
    setRole(role)
  }

  async function signOut() {
    const uid = user.value?.uid
    await signOutCurrentUser()
    if (uid) sessionStorage.removeItem(`niryaatx-role:${uid}`)
    user.value = null
  }

  return {
    user,
    authReady,
    authError,
    isConfigured: firebaseConfigured,
    isAuthenticated,
    initialize,
    signIn,
    createAccount,
    signOut,
  }
})
