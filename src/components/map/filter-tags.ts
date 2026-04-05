export interface FilterTag {
  id: string;
  label: string;
  icon: string;
}

export const FILTER_TAGS: FilterTag[] = [
  { id: "parking", label: "Parking", icon: "ParkingCircle" },
  { id: "problems", label: "Problemi na putu", icon: "TriangleAlert" },
  { id: "blocked", label: "Blokirane ulice", icon: "Ban" },
];
