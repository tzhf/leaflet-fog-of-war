import { ref, onMounted, onUnmounted } from 'vue'

export function useDeviceOrientation() {
  const heading = ref<number>(0)
  const permissionGranted = ref<boolean | null>(null)

  const handleOrientation = (event: DeviceOrientationEvent) => {
    heading.value = Math.round(event.alpha || 0)
  }

  const requestPermissionIfNeeded = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        permissionGranted.value = permission === 'granted'
        if (permissionGranted.value) {
          window.addEventListener('deviceorientation', handleOrientation)
        } else {
          console.warn('Permission denied for device orientation')
        }
      } catch (err) {
        console.error('Device orientation permission error:', err)
        permissionGranted.value = false
      }
    } else {
      // Android/desktop — autorisé par défaut
      window.addEventListener('deviceorientation', handleOrientation)
      permissionGranted.value = true
    }
  }

  onMounted(() => {
    requestPermissionIfNeeded()
  })

  onUnmounted(() => {
    window.removeEventListener('deviceorientation', handleOrientation)
  })

  return {
    heading,
    permissionGranted,
  }
}
