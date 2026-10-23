<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getAuthErrorMessage } from '../services/firebase'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const videoSource = computed(() => `https://www.youtube-nocookie.com/embed/wQMx7wc4jh8?autoplay=1&mute=1&controls=0&loop=1&playlist=wQMx7wc4jh8&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&autohide=1&fs=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`)
const signup = computed(() => route.meta.signup || route.path === '/signup')
const email = ref('')
const password = ref('')
const role = ref('Exporter')
const visible = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) || password.value.length < 8) {
    error.value = 'Enter a valid email and a password of at least 8 characters.'
    return
  }
  loading.value = true
  try {
    if (signup.value) await auth.createAccount(email.value, password.value, role.value)
    else await auth.signIn(email.value, password.value, role.value)
    const redirect = route.query.redirect
    const destination = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
      ? redirect
      : '/dashboard'
    await router.push(destination)
  } catch (submitError) {
    error.value = getAuthErrorMessage(submitError)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="auth-video-background" aria-hidden="true">
      <iframe
        v-if="!reduceMotion"
        :src="videoSource"
        title="Cargo ship crossing the ocean"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerpolicy="strict-origin-when-cross-origin"
        tabindex="-1"
      ></iframe>
    </div>
    <div class="auth-video-shade" aria-hidden="true"></div>
    <section class="auth-art" aria-label="NiryaatX at sea">
      <RouterLink to="/" class="brand auth-art-brand" aria-label="NiryaatX home">
        <img class="brand-mark" src="/niryaatx-logo.png" alt="" />
        <span>NIRYAAT<span class="brand-x">X</span></span>
      </RouterLink>
      <div class="auth-art-copy">
        <p class="eyebrow"><span class="status-dot"></span> GLOBAL TRADE, IN CLEARER VIEW</p>
        <h1>Your next move<br />starts <em>here.</em></h1>
        <p>One connected view of currency, routes and the voyage ahead.</p>
      </div>
      <div class="auth-voyage-card">
        <span class="auth-voyage-kicker">THE VOYAGE, CONNECTED</span>
        <span><i>01</i> Currency <b>·</b> <i>02</i> Route <b>·</b> <i>03</i> Arrival</span>
      </div>
      <div class="auth-art-bottom">NIRYAATX <span>·</span> NAVIGATE TRADE. CONTROL RISK.</div>
    </section>
    <section class="auth-panel">
      <RouterLink to="/" class="auth-back">← Back to home</RouterLink>
      <form class="auth-form" @submit.prevent="submit">
        <p class="auth-kicker">{{ signup ? 'CREATE YOUR ACCOUNT' : 'WELCOME ABOARD' }}</p>
        <h2>{{ signup ? 'Set your course.' : 'Good to have you back.' }}</h2>
        <p class="auth-helper">{{ signup ? 'Create a workspace for a clearer view of your trade.' : 'Sign in to continue to your trade intelligence workspace.' }}</p>
        <p v-if="!auth.isConfigured" class="auth-setup-note" role="status">{{ auth.authError }} Copy <code>.env.example</code> to <code>.env</code>, add your Firebase web app values, and enable Email/Password sign-in.</p>
        <p v-else-if="auth.authError" class="form-error" role="alert">{{ auth.authError }}</p>
        <label for="auth-email">Email address<input id="auth-email" v-model="email" type="email" autocomplete="email" placeholder="you@company.com" required /></label>
        <label for="auth-password">Password<div class="password-input"><input id="auth-password" v-model="password" :type="visible ? 'text' : 'password'" :autocomplete="signup ? 'new-password' : 'current-password'" minlength="8" placeholder="At least 8 characters" required /><button type="button" :aria-label="visible ? 'Hide password' : 'Show password'" @click="visible = !visible">{{ visible ? 'Hide' : 'Show' }}</button></div></label>
        <label for="auth-role">I’m joining as<select id="auth-role" v-model="role"><option>Exporter</option><option>Importer</option></select></label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="button button-primary auth-submit" :disabled="loading || !auth.isConfigured">{{ loading ? 'Connecting securely…' : signup ? 'Create your account' : 'Sign in to workspace' }} <span>↗</span></button>
        <p class="demo-notice"><span aria-hidden="true">◇</span> Secured with Firebase Authentication.</p>
        <p class="auth-switch">{{ signup ? 'Already have an account?' : 'New to NiryaatX?' }} <RouterLink :to="signup ? '/login' : '/signup'">{{ signup ? 'Log in' : 'Create an account' }} <span aria-hidden="true">↗</span></RouterLink></p>
      </form>
    </section>
  </main>
</template>
