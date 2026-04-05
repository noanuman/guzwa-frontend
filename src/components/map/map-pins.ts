export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  type: "parking";
}

export const SAMPLE_PINS: MapPin[] = [
  {
    id: "2",
    lat: 44.8048,
    lng: 20.4823,
    title: "Parking — Knez Mihailova",
    description: "Privatna garaža, 2 slobodna mesta",
    type: "parking",
  },
  {
    id: "5",
    lat: 44.7932,
    lng: 20.5021,
    title: "Parking — Voždovac",
    description: "Parking mesto, dostupno radnim danima",
    type: "parking",
  },
];
