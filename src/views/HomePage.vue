<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerGreen from '../assets/markers/marker-green.png'

import '../composables/useFogOfWar'
import { useGeolocation } from '../composables/useGeolocation'
import { useDeviceOrientation } from '../composables/useDeviceOrientation'

const { currentPosition, error } = useGeolocation()

const { heading, permissionGranted } = useDeviceOrientation()

let map: L.Map | null = null
let marker: L.Marker | null = null
let fog: L.FogLayer | null = null

let keepAwakeSupported = false
onMounted(async () => {
  const { isSupported } = await KeepAwake.isSupported()
  keepAwakeSupported = isSupported
  if (keepAwakeSupported) {
    await KeepAwake.keepAwake()
  }

  trackUserPosition()
  // await nextTick()
  await createMap()
})

async function createMap() {
  if (map) return map

  const center = {
    lat: currentPosition.value?.coords.latitude ?? 45,
    lng: currentPosition.value?.coords.longitude ?? 4.8,
  }

  map = L.map('map', {
    center: [center.lat, center.lng],
    zoom: 19,
    minZoom: 2,
    // worldCopyJump: true,
    maxBoundsViscosity: 1.0,
    maxBounds: [
      [-90, -180],
      [90, 180],
    ],
  }).setView([center.lat, center.lng])

  // OSM tile layer
  L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map)

  // Google Maps tile layer
  // L.tileLayer(
  //   'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m2!1e0!2sm!3m5!2sen!3sus!5e1105!12m1!1e3!4e0!5m4!1e0!8m2!1e1!1e1!6m6!1e12!2i2!11e0!39b0!44e0!50e0',
  //   { maxZoom: 21 }
  // ).addTo(map)

  const icon = L.icon({ iconUrl: markerGreen, iconAnchor: [12, 41] })
  marker = L.marker([center.lat, center.lng], { icon }).addTo(map)

  fog = L.fogLayer([]).addTo(map)
  fog.addCurrentLatLng([center.lat, center.lng])
  fog.setHeading(heading.value)

  const mapDiv = document.getElementById('map') as HTMLElement
  const resizeObserver = new ResizeObserver(() => {
    map?.invalidateSize()
  })
  resizeObserver.observe(mapDiv)
}

watch(heading, (newHeading) => {
  if (fog && marker && newHeading != null) {
    fog.setHeading(newHeading)
  }
})

let lastLatLng: L.LatLng | null = null
const MIN_DISTANCE_METERS = 2

function trackUserPosition() {
  watch(currentPosition, async (pos) => {
    if (!pos || !pos.coords) return

    const lat = pos.coords.latitude
    const lng = pos.coords.longitude
    const newLatLng = L.latLng(lat, lng)

    if (lastLatLng) {
      const distance = lastLatLng.distanceTo(newLatLng)
      if (distance < MIN_DISTANCE_METERS) {
        return
      }
    }
    lastLatLng = newLatLng

    map?.setView([lat, lng])
    marker?.setLatLng([lat, lng])
    fog.addLatLng({ lat, lng })
  })
}

onBeforeUnmount(async () => {
  if (keepAwakeSupported) {
    await KeepAwake.allowSleep()
  }
})
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>a</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div id="map"></div>
      <div id="container">
        <div v-if="error" style="color: red">Erreur: {{ error }}</div>
        <div v-else-if="currentPosition">
          <p>Timestamp : {{ currentPosition.timestamp }}</p>
          <p>Latitude : {{ currentPosition.coords.latitude }}</p>
          <p>Longitude : {{ currentPosition.coords.longitude }}</p>
          <p>Heading : {{ currentPosition.coords.heading }}</p>
        </div>
        <div v-else>En attente de position...</div>

        <!-- ici tu peux fake le heading sur navigateur ) -->
        <p>heading (compas) : {{ heading }}</p>
        <input type="range" v-model="heading" min="0" max="360" step="1" />
      </div>
    </ion-content>
  </ion-page>
</template>

<style>
#map {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 80%;
  z-index: 1;
}

#container {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  text-align: center;
  font-size: 0.5rem;
  padding: 0.5rem 0;
}
/* html,
body {
  background: transparent !important;
  --background: transparent !important;
}

:root {
  ion-content {
    --padding-top: env(safe-area-inset-top);
    --background: transparent !important;
  }
} */
</style>
