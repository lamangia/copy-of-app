export interface Wall {
  length: number;
  angle: number;
}

export interface PlacedItem {
  id: string;
  type: 'door' | 'window';
  wallIndex: number;
  position: number; // 0-1, percentage along the wall
  width: number; // in floorplan units
}

export interface FloorplanFile {
  dimensions?: {
    length: number;
    width: number;
    units: 'ft' | 'm';
  };
  doors?: number;
  windows?: number;
  detailedLayout?: {
    units: 'ft' | 'm';
    walls: Wall[];
  };
  placedItems?: PlacedItem[];
}