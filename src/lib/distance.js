/**
 * Haversine distance calculation utilities.
 * Used by the customer tracking page and the /api/trips/active endpoint.
 */

const EARTH_KM = 6371

/**
 * Great-circle distance between two WGS-84 coordinates.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in kilometres
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = deg => deg * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Human-readable distance string.
 * @param {number} km
 * @returns {string}  e.g. "350 m"  or  "2.4 km"
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/**
 * Rough ETA assuming urban average speed.
 * @param {number} km
 * @param {number} [speedKmh=28]
 * @returns {number} Whole minutes (minimum 1)
 */
export function etaMinutes(km, speedKmh = 28) {
  return Math.max(1, Math.ceil((km / speedKmh) * 60))
}
