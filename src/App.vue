<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { getAuthErrorMessage } from './services/firebase'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const signOutError = ref('')
async function signOut() {
  signOutError.value = ''
  try {
    await auth.signOut()
    await router.push('/')
  } catch (error) {
    signOutError.value = getAuthErrorMessage(error)
  }
}
</script>

<template>
  <header v-if="!route.path.startsWith('/dashboard') && route.path !== '/analysis' && route.path !== '/login' && route.path !== '/signup'" class="site-nav">
    <RouterLink class="brand" to="/" aria-label="NiryaatX home"><img class="brand-mark" src="/niryaatx-logo.png" alt="" /><span>NIRYAAT<span class="brand-x">X</span></span></RouterLink>
    <nav aria-label="Main navigation">
      <a href="/#approach">Approach</a><a href="/#intelligence">Intelligence</a><a href="/#audience">Who it's for</a>
    </nav>
    <div class="nav-actions">
      <RouterLink v-if="!auth.isAuthenticated" class="nav-login" to="/login">Log in</RouterLink>
      <button v-else class="nav-login" @click="signOut">Sign out</button>
      <span v-if="signOutError" class="auth-nav-error" role="alert">{{ signOutError }}</span>
      <a class="nav-cta" href="/#analyse">Analyse a shipment <span>↗</span></a>
    </div>
  </header>
  <RouterView />
</template>
