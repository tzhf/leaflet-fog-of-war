<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>a</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <capacitor-google-map
        ref="mapRef"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999"
      ></capacitor-google-map>
      <!-- <div id="container">
        <div class="p-4">
          <h2 class="text-lg font-bold mb-2">sGéolocalisation en temps réel</h2>

          <div v-if="error" class="text-red-500">Erreur : {{ error }}</div>

          <div v-if="error" class="text-red-500">{{ error }}</div>
          <div v-else-if="currentPosition">
            <p>Timesssstsamp : {{ currentPosition.timestamp }}</p>
            <p>Latitude : {{ currentPosition.coords.latitude }}</p>
            <p>Longitude : {{ currentPosition.coords.longitude }}</p>
            <p>Heading : {{ currentPosition.coords.heading }}</p>
          </div>
          <div v-else>En attente de position...</div>
          __
          <div v-if="alpha">
            <p>Permission: {{ permissionGranted }}</p>
            <p>Alpha (compas) : {{ alpha }}</p>
          </div>
        </div>
      </div> -->
    </ion-content>
  </ion-page>
</template>

<style>
html,
body {
  background: transparent !important;
  --background: transparent !important;
}

:root {
  ion-content {
    --padding-top: env(safe-area-inset-top);
    --background: transparent !important;
  }
}
</style>

<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { onMounted, watch, nextTick, ref } from 'vue'

import { Loader } from '@googlemaps/js-api-loader'
import { GoogleMap } from '@capacitor/google-maps'
import { useGeolocation } from '../composables/useGeolocation'
import { useDeviceOrientation } from '../composables/useDeviceOrientation'

let previousPosition: GeolocationPosition | null = null
const { currentPosition, error } = useGeolocation()

const { heading, permissionGranted } = useDeviceOrientation()

const mapRef = ref<HTMLDivElement | null>(null)
const map = ref<google.maps.Map | null>(null)
let marker: google.maps.Marker | null = null

const loader = new Loader({
  apiKey: 'AIzaSyB5pp3F144pqXys3DV2Vyb7DZcWcS2_GmQ',
  version: 'weekly',
})

onMounted(async () => {
  console.log('mounted', mapRef.value)
  trackUserPosition()
  await nextTick()
  await createMap()
})

async function createMap() {
  if (!mapRef.value) return

  await loader.importLibrary('maps')

  const center = {
    lat: currentPosition.value?.coords.latitude ?? 0,
    lng: currentPosition.value?.coords.longitude ?? 0,
  }

  map.value = new google.maps.Map(mapRef.value, {
    center,
    tilt: 0, // 👈 Prevents the map from tilting
    zoom: 20,

    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  })

  addMarker(center)
}

const arrowIcon = (rotation: number): google.maps.Symbol => ({
  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
  scale: 5,
  strokeColor: '#4285F4',
  anchor: new google.maps.Point(2.5, 2.5),
  rotation,
})

function addMarker(position: { lat: number; lng: number }) {
  marker = new google.maps.Marker({
    position: position,
    map: map.value,
    icon: arrowIcon(0),
    clickable: false,
    zIndex: 100,
  })
}

watch(heading, (newHeading) => {
  if (marker && newHeading != null) {
    marker.setIcon(arrowIcon(newHeading))
  }
})

function trackUserPosition() {
  watch(currentPosition, async (pos) => {
    if (!pos) return

    if (pos.coords) {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude

      map.value?.panTo({ lat, lng })

      marker?.setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      })
    }
  })
}
</script>

<style scoped>
#container {
  text-align: center;

  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

#container strong {
  font-size: 20px;
  line-height: 26px;
}

#container p {
  font-size: 16px;
  line-height: 22px;

  color: #8c8c8c;

  margin: 0;
}

#container a {
  text-decoration: none;
}
</style>
