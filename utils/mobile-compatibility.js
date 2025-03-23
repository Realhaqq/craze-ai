/**
 * Utility functions to handle mobile browser compatibility issues
 * Made safe for server-side rendering
 */

/**
 * Detects if the current device is a mobile device
 * @returns {boolean} True if the current device is a mobile device
 */
export function isMobileDevice() {
  // First check if we're in a browser environment
  if (typeof window === 'undefined') return false;
  
  // Safely check for touch support
  const hasTouch = Boolean(
    'ontouchstart' in window || 
    (window.navigator && window.navigator.maxTouchPoints > 0) ||
    (window.navigator && window.navigator.msMaxTouchPoints > 0)
  );
  
  // Additional check for user agent
  if (hasTouch && typeof navigator !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(
      navigator.userAgent
    );
  }
  
  return false;
}

/**
 * Gets the name of the mobile browser or device
 * @returns {string} Name of the browser or device
 */
export function getMobileInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Unknown';
  
  const ua = navigator.userAgent;
  
  if (ua.match(/iPad/i)) return 'iPad';
  if (ua.match(/iPhone/i)) return 'iPhone';
  if (ua.match(/Android/i)) return 'Android';
  if (ua.match(/Windows Phone/i)) return 'Windows Phone';
  
  if (ua.match(/Chrome|CriOS/i)) return 'Chrome Mobile';
  if (ua.match(/Firefox|FxiOS/i)) return 'Firefox Mobile';
  if (ua.match(/Safari/i)) return 'Safari Mobile';
  
  return 'Unknown Mobile Browser';
}

/**
 * Unlocks audio playback on iOS devices that require user interaction
 * @param {HTMLAudioElement} audioElement - The audio element to unlock
 * @returns {Promise<boolean>} Promise that resolves to true if unlocking was successful
 */
export function unlockAudioOnMobile(audioElement) {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }
  
  return new Promise((resolve) => {
    if (!audioElement) {
      resolve(false);
      return;
    }
    
    // iOS requires user interaction to play audio
    const unlockAudio = () => {
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
            resolve(true);
          })
          .catch(() => {
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
            resolve(false);
          });
      } else {
        resolve(false);
      }
    };
    
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
  });
}

/**
 * Checks if the current browser is iOS Safari which has special restrictions
 * @returns {boolean} True if the browser is iOS Safari
 */
export function isIOSSafari() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && 
         !window.MSStream && 
         !/CriOS/.test(ua) && 
         !/FxiOS/.test(ua);
}
