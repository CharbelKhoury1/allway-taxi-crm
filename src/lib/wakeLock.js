/**
 * Wake Lock — keeps the driver screen on across all iOS/Android versions.
 *
 * Layer 1 — Screen Wake Lock API  (iOS 16.4+, Android Chrome 84+)
 *   Native browser API. Re-acquired automatically after tab visibility change.
 *
 * Layer 2 — Web Audio API silent loop  (iOS 15+, most Android)
 *   Playing a near-silent audio buffer keeps the browser's audio session alive,
 *   which prevents iOS from suspending the web process and stopping geolocation.
 *   Must be called inside a user-gesture handler (it is — goOnline() is a tap).
 *
 * Layer 3 — Silent video loop  (iOS 12–14, older Android)
 *   A 1×1 invisible <video> element tricks iOS into treating the tab as
 *   "media playing", which suppresses auto-lock.
 *
 * Layer 4 — UI warning banner
 *   Last resort. The driver is shown a persistent "Keep screen on" message.
 */

let _sentinel  = null   // Screen Wake Lock sentinel
let _audioCtx  = null   // Web Audio context
let _audioSrc  = null   // Web Audio buffer source
let _videoEl   = null   // Fallback video element
let _visHandle = null   // visibilitychange handler ref

export async function acquireWakeLock() {
  _cleanup()

  // ── Layer 1: Screen Wake Lock API ─────────────────────────
  if ('wakeLock' in navigator) {
    try {
      _sentinel = await navigator.wakeLock.request('screen')

      // iOS and Chrome release the lock when the tab hides — re-acquire on return.
      _visHandle = async () => {
        if (document.visibilityState === 'visible' && _sentinel?.released) {
          try { _sentinel = await navigator.wakeLock.request('screen') }
          catch (_) {}
        }
      }
      document.addEventListener('visibilitychange', _visHandle)

      return { method: 'wakeLock', release: _cleanup }
    } catch (e) {
      console.warn('[WakeLock] Screen Wake Lock failed:', e.message)
    }
  }

  // ── Layer 2: Web Audio API silent loop ────────────────────
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (AudioCtx) {
    try {
      _audioCtx = new AudioCtx()

      // Resume immediately — required on iOS after context creation
      if (_audioCtx.state === 'suspended') await _audioCtx.resume()

      // 2-second silent buffer played on loop
      const buf = _audioCtx.createBuffer(1, _audioCtx.sampleRate * 2, _audioCtx.sampleRate)
      _audioSrc = _audioCtx.createBufferSource()
      _audioSrc.buffer = buf
      _audioSrc.loop = true

      // Gain at 0.001 — iOS skips truly-silent audio on some versions
      const gain = _audioCtx.createGain()
      gain.gain.value = 0.001
      _audioSrc.connect(gain)
      gain.connect(_audioCtx.destination)
      _audioSrc.start(0)

      // Re-resume audio context after the tab becomes visible again
      _visHandle = async () => {
        if (document.visibilityState === 'visible' && _audioCtx?.state === 'suspended') {
          try { await _audioCtx.resume() } catch (_) {}
        }
      }
      document.addEventListener('visibilitychange', _visHandle)

      return { method: 'audio', release: _cleanup }
    } catch (e) {
      console.warn('[WakeLock] Web Audio failed:', e.message)
      _cleanup()
    }
  }

  // ── Layer 3: Silent <video> loop ──────────────────────────
  try {
    _videoEl = document.createElement('video')
    _videoEl.setAttribute('playsinline', '')
    _videoEl.setAttribute('webkit-playsinline', '')
    _videoEl.setAttribute('muted', '')
    _videoEl.muted  = true
    _videoEl.loop   = true
    _videoEl.style.cssText =
      'position:fixed;width:1px;height:1px;top:0;left:0;opacity:0.01;pointer-events:none;z-index:-1;'

    // Minimal valid MP4 — 1 frame, 1×1 px, black, ~500 bytes
    _videoEl.src =
      'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA' +
      'HFtZGF0AAACoAYF//+c3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1NSByMjkxNyAwYTg0ZDk4' +
      'IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxOCAtIGh0dHA6Ly93d3cu' +
      'dmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6AGQAAAMBliWIQAAAAA9liWIQAAAD/2Q=='

    document.body.appendChild(_videoEl)
    await _videoEl.play()

    return { method: 'video', release: _cleanup }
  } catch (e) {
    console.warn('[WakeLock] Video fallback failed:', e.message)
    _cleanup()
  }

  // ── Layer 4: Nothing worked — show UI warning ─────────────
  return { method: 'none', release: _cleanup }
}

function _cleanup() {
  if (_visHandle) {
    document.removeEventListener('visibilitychange', _visHandle)
    _visHandle = null
  }
  if (_sentinel) {
    _sentinel.release().catch(() => {})
    _sentinel = null
  }
  if (_audioSrc) {
    try { _audioSrc.stop() } catch (_) {}
    _audioSrc = null
  }
  if (_audioCtx) {
    _audioCtx.close().catch(() => {})
    _audioCtx = null
  }
  if (_videoEl) {
    _videoEl.pause()
    _videoEl.remove()
    _videoEl = null
  }
}
