const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48"><rect x="4" y="0" width="3" height="44" rx="1.5" fill="%238a7e74"/><path d="M7 2 L36 8 L30 16 L36 24 L7 18 Z" fill="%23F08D39"/><circle cx="5.5" cy="45" r="3" fill="%23F08D39" fill-opacity="0.4"/><circle cx="5.5" cy="45" r="1.5" fill="%23F08D39"/></svg>`;
const GUZWA_FLAG_URL = `data:image/svg+xml;charset=UTF-8,${svg}`;

export function createDestinationFlag(
  map: google.maps.Map,
  position: google.maps.LatLng
): google.maps.Marker {
  return new google.maps.Marker({
    map,
    position,
    icon: {
      url: GUZWA_FLAG_URL,
      scaledSize: new google.maps.Size(40, 48),
      anchor: new google.maps.Point(5, 45),
    },
    zIndex: 5,
  });
}
