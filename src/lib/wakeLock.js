/**
 * Wake Lock utility — keeps the driver's screen on while they are online.
 *
 * Strategy (3-layer fallback so it works on every iOS/Android version):
 *
 * Layer 1 — Screen Wake Lock API (iOS 16.4+, Chrome Android 84+)
 *   navigator.wakeLock.request('screen') — native, no battery tricks.
 *
 * Layer 2 — Silent video loop (iOS < 16.4, older Android)
 *   A 1-second transparent WebM/MP4 played on loop. iOS treats an active
 *   <video> element as user media, preventing auto-lock.
 *
 * Layer 3 — UI banner
 *   If both fail, show the driver a persistent "Keep screen on" warning.
 *
 * Usage:
 *   const lock = await acquireWakeLock()
 *   lock.release()       // call when driver goes offline
 */

let wakeLockSentinel = null   // Screen Wake Lock API handle
let videoEl = null            // fallback video element

export async function acquireWakeLock() {
  // --- Layer 1: Screen Wake Lock API ---
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen')

      // The lock is automatically released when the tab loses visibility.
      // Re-acquire it when the driver comes back to the tab.
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && wakeLockSentinel?.released) {
          try {
            wakeLockSentinel = await navigator.wakeLock.request('screen')
          } catch (_) { /* visibility change during page unload, safe to ignore */ }
        }
      })

      return {
        method: 'wakeLock',
        release: () => {
          wakeLockSentinel?.release()
          wakeLockSentinel = null
        },
      }
    } catch (err) {
      // Battery too low, or permission denied — fall through to Layer 2
      console.warn('Wake Lock API unavailable, falling back to video trick:', err.message)
    }
  }

  // --- Layer 2: Silent video loop ---
  // A tiny 1×1 transparent video keeps iOS from sleeping.
  try {
    videoEl = document.createElement('video')
    videoEl.setAttribute('playsinline', '')
    videoEl.setAttribute('muted', '')
    videoEl.loop = true
    videoEl.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;'

    // Inline 1-second silent MP4 (base64 — 674 bytes, no network request)
    videoEl.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA' +
      'u1tZGF0AAACrAYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1NSByMjkxNyAwYTg0ZDk4IC0g' +
      'SC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxOCAtIGh0dHA6Ly93d3cudmlkZW9s' +
      'YW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNl' +
      'PTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1l' +
      'X3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBm' +
      'YXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBz' +
      'bGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNv' +
      'bnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJl' +
      'Y3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNj' +
      'ZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0y' +
      'My4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4w' +
      'MAAAAA9liWIQAAAD/2Q=='

    document.body.appendChild(videoEl)
    await videoEl.play()

    return {
      method: 'video',
      release: () => {
        videoEl?.pause()
        videoEl?.remove()
        videoEl = null
      },
    }
  } catch (_) {
    // Layer 2 also failed (user denied autoplay). Return a no-op with a flag
    // so the UI can show the "Keep screen on" banner.
    return {
      method: 'none',  // UI should show manual warning banner
      release: () => {},
    }
  }
}
