import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Geolocation, PermissionStatus, Position } from '@capacitor/geolocation'

export function useGeolocation() {
  const currentPosition = ref<Position | null>(null)
  const error = ref<string | null>(null)
  let watchId: string | null = null

  const startTracking = async () => {
    try {
      const status: PermissionStatus = await Geolocation.checkPermissions()

      if (status.location !== 'granted') {
        const requested = await Geolocation.requestPermissions()
        if (requested.location !== 'granted') {
          error.value = 'Permission refusée pour la géolocalisation.'
          return
        }
      }

      watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 1000,
        },
        (position, err) => {
          if (err) {
            error.value = err.message
            return
          }

          if (position) {
            currentPosition.value = position
            error.value = null
          }
        }
      )
    } catch (e: any) {
      error.value = e?.message || 'Erreur lors de la demande de géolocalisation.'
    }
  }

  const stopTracking = () => {
    if (watchId) {
      Geolocation.clearWatch({ id: watchId })
      watchId = null
    }
  }

  onBeforeUnmount(() => {
    stopTracking()
  })

  onMounted(() => {
    startTracking()
  })

  return {
    currentPosition,
    error,
    startTracking,
    stopTracking,
  }
}
