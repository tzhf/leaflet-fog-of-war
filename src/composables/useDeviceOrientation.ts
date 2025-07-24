import { ref, onMounted, onUnmounted } from 'vue'

export function useDeviceOrientation() {
  const heading = ref<number>(0)
  const permissionGranted = ref<boolean | null>(null)

  const handleOrientation = (event: DeviceOrientationEvent) => {
    const alpha = event.alpha ?? 0
    const beta = event.beta ?? 0
    const gamma = event.gamma ?? 0

    let correctedHeading = alpha + (beta * gamma) / 90 // Heuristic correction based on tilt
    correctedHeading = ((correctedHeading % 360) + 360) % 360 // Normalize to [0, 360)

    heading.value = Math.round(correctedHeading)
  }

  const eventType =
    'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'

  const requestPermissionIfNeeded = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        permissionGranted.value = permission === 'granted'

        if (permissionGranted.value) {
          window.addEventListener(eventType, handleOrientation)
        } else {
          console.warn('Permission denied for device orientation')
        }
      } catch (err) {
        console.error('Device orientation permission error:', err)
        permissionGranted.value = false
      }
    } else {
      // Android or desktop — permission not required
      window.addEventListener(eventType, handleOrientation)
      permissionGranted.value = true
    }
  }

  onMounted(() => {
    requestPermissionIfNeeded()
  })

  onUnmounted(() => {
    window.removeEventListener(eventType, handleOrientation)
  })

  return {
    heading,
    permissionGranted,
  }
}
