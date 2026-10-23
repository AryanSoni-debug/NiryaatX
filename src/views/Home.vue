<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { defineAsyncComponent } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import ShipmentForm from '../components/ShipmentForm.vue'

const OceanScene = defineAsyncComponent(() => import('../components/OceanScene.vue'))

let lenis
let ticker
onMounted(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true })
    ticker = (time) => lenis?.raf(time * 1000)
    gsap.ticker.add(ticker)
    gsap.ticker.lagSmoothing(0)
  }
  gsap.registerPlugin(ScrollTrigger)
  if (reduce) {
    gsap.set('.reveal', { y: 0, autoAlpha: 1 })
  } else {
    gsap.utils.toArray('.reveal').forEach((element) => {
      gsap.fromTo(element, { y: 24, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: 0.85, ease: 'power2.out',
        scrollTrigger: { trigger: element, start: 'top 86%', once: true },
      })
    })
  }
})
onBeforeUnmount(() => {
  if (ticker) gsap.ticker.remove(ticker)
  lenis?.destroy()
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
})

const agents = [
  ['01', 'Currency outlook', 'Scenario-based exposure and market context. No untrained model predictions.'],
  ['02', 'Route intelligence', 'Compare available route options by cost, transit estimate, and priority.'],
  ['03', 'Weather awareness', 'Surface route weather considerations when verified feeds are connected.'],
  ['04', 'Port conditions', 'Understand congestion indicators with source and freshness made explicit.'],
  ['05', 'Financial view', 'Bring shipment value, costs, and currency scenarios into one decision.'],
]
</script>

<template>
  <main>
    <div class="cinema">
      <OceanScene />
      <div class="hero-vignette"></div>
      <svg class="hero-route-line" viewBox="0 0 900 540" fill="none" aria-hidden="true">
        <path class="route-line-track" d="M86 440C245 394 218 159 420 196S631 385 810 94" />
        <circle class="route-line-node" r="4" />
      </svg>
      <div class="hero-vessel-label mono"><span class="status-dot"></span> NIRYAATX VESSEL <span class="hero-label-divider">/</span> 3D SCENE</div>
      <section class="hero-copy">
        <p class="eyebrow"><span class="status-dot"></span> A CLEARER COURSE THROUGH GLOBAL TRADE</p>
        <h1>Move trade<br />with <em>clarity.</em></h1>
        <p class="hero-subtitle">Every signal. One sharper view.</p>
        <p class="hero-description">See currency exposure, route choices and shipping uncertainty together—before the next decision sets sail.</p>
        <div class="hero-actions"><a href="#analyse" class="button button-primary">Explore your shipment <span>↗</span></a><a href="#approach" class="button button-outline">Discover NiryaatX</a></div>
        <div class="hero-proof"><span><strong>01</strong> CURRENCY</span><span><strong>02</strong> ROUTE</span><span><strong>03</strong> PORT & WEATHER</span></div>
      </section>
      <div class="hero-coordinates mono">TRADE INTELLIGENCE <span>·</span> BUILT FOR THE VOYAGE</div>
      <div class="hero-route-card"><span class="route-card-label mono">A ROUTE IN MOTION <i></i></span><strong>Mumbai <i>→</i> Rotterdam</strong><span class="route-card-meta">ARABIAN SEA <b>·</b> INDICATIVE ROUTE</span></div>
      <a href="#approach" class="scroll-cue"><span></span> SCROLL TO EXPLORE <b>↓</b></a>
      <div class="hero-caption"><span class="caption-line"></span> Navigate trade. Control risk.</div>
    </div>

    <section id="approach" class="story-section story-problem">
      <div class="section-index">01 / THE EXPOSURE</div>
      <div class="story-grid reveal">
        <div><p class="eyebrow eyebrow-dark">WHEN CARGO IS ALREADY AT SEA</p><h2>Your payment arrives<br />weeks after your cargo <em>leaves.</em></h2></div>
        <div class="story-detail"><p>Between departure and settlement, currency movements, weather, port congestion, and route changes can reshape the economics of a trade.</p><div class="risk-list"><span>Currency volatility</span><span>Port congestion</span><span>Weather disruptions</span><span>Route uncertainty</span><span>Vessel capacity</span></div></div>
      </div>
    </section>

    <section class="story-section solution-section">
      <div class="section-index">02 / A CONNECTED VIEW</div>
      <div class="solution-heading reveal"><p class="eyebrow">ONE SHIPMENT. MANY SIGNALS.</p><h2>One shipment. A clearer<br />picture of <em>every risk.</em></h2><p>Specialist analysis comes together in a single, explainable view—so your next decision starts with the whole voyage in sight.</p></div>
      <div class="process-line reveal"><div v-for="(step, index) in ['Shipment details', 'Currency outlook', 'Route intelligence', 'Weather & port', 'Financial view', 'Unified insight']" :key="step" class="process-step"><span class="process-number">0{{ index + 1 }}</span><span>{{ step }}</span><i v-if="index < 5">→</i></div></div>
      <div id="intelligence" class="agent-grid">
        <article v-for="agent in agents" :key="agent[0]" class="agent-item reveal"><span class="agent-number mono">{{ agent[0] }} / SIGNAL</span><h3>{{ agent[1] }}</h3><p>{{ agent[2] }}</p></article>
      </div>
    </section>

    <section class="deep-section">
      <div class="deep-orb" aria-hidden="true"></div><div class="deep-copy reveal"><p class="eyebrow">BEYOND THE SURFACE</p><h2>Look beneath the<br />surface of <em>every trade.</em></h2><p>See currency exposure beside route and timing uncertainty. Understand what is known, what is estimated, and what still needs a live data source.</p><a href="#analyse" class="text-link">Bring your shipment into view <span>↗</span></a></div>
      <div class="data-threads" aria-hidden="true"><span>FX EXPOSURE <b>↗</b></span><span>ARRIVAL WINDOW <b>—</b></span><span>PORT SIGNAL <b>•••</b></span></div>
    </section>

    <section class="story-section outcome-section">
      <div class="section-index">03 / THE DESTINATION</div>
      <div class="outcome-copy reveal"><p class="eyebrow">NIRYAATX · NAVIGATE TRADE. CONTROL RISK.</p><h2>Make the next<br />decision with <em>clarity.</em></h2><p>Connected financial and logistics intelligence for the people moving global trade forward.</p><a href="#analyse" class="button button-primary">Start with a shipment <span>↗</span></a></div>
      <div class="horizon-line"></div>
    </section>

    <section id="audience" class="audience-section">
      <div class="section-index">04 / BUILT FOR THE VOYAGE</div><div class="audience-grid">
        <article class="audience-intro reveal"><p class="eyebrow">WHO IT'S FOR</p><h2>Trade moves<br />because <em>you do.</em></h2></article>
        <article class="audience-item reveal"><span>01</span><h3>Exporters</h3><p>Understand expected receipts, currency exposure, and export margin considerations.</p></article>
        <article class="audience-item reveal"><span>02</span><h3>Importers</h3><p>Estimate payment scenarios, landed costs, and arrival timelines.</p></article>
        <article class="audience-item reveal"><span>03</span><h3>Logistics teams</h3><p>Bring shipping risks and disruption signals into one shared view.</p></article>
        <article class="audience-item reveal"><span>04</span><h3>Growing businesses</h3><p>Explore useful trade intelligence without a large treasury operation.</p></article>
      </div>
    </section>

    <section id="analyse" class="analysis-entry">
      <div class="analysis-aside reveal"><p class="eyebrow">YOUR NEXT VOYAGE</p><h2>Start with the<br /><em>shipment.</em></h2><p>Enter what you know. NiryaatX will keep your details with you while you sign in.</p><div class="form-assurance"><span>01</span> Your details stay in this browser session until analysis.</div><div class="form-assurance"><span>02</span> Demo results are labelled; no live feeds are implied.</div></div>
      <div class="analysis-form-wrap reveal"><ShipmentForm /></div>
    </section>
    <footer class="site-footer"><RouterLink to="/" class="brand"><img class="brand-mark" src="/niryaatx-logo.png" alt="" /><span>NIRYAAT<span class="brand-x">X</span></span></RouterLink><a class="model-download" href="/models/niryaatx-container-ship.glb" download="niryaatx-container-ship.glb">Download 3D vessel <span>↓</span></a><span>Navigate Trade. Control Risk.</span><span class="footer-demo">Prototype · Demonstration data</span></footer>
  </main>
</template>
