export function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceBetweenMeters(
  originLat: number,
  originLng: number,
  targetLat: number,
  targetLng: number,
) {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(targetLat - originLat);
  const deltaLng = toRadians(targetLng - originLng);
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(targetLat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}
