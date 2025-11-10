// Fix: Import `ReactElement` to resolve "Cannot find namespace 'JSX'" error.
import type { ReactElement } from 'react';

export interface Room {
  id: string;
  name: string;
  icon: ReactElement;
}

export interface Style {
  id: string;
  name: string;
}

export interface Store {
  id: string;
  name: string;
}

export interface Tier {
  id: 'basic' | 'gold' | 'platinum';
  name: string;
  renderings: number;
  price: string;
  description: string;
}

export interface Wall {
  length: number;
  angle: number;
}

export interface FloorplanFile {
  data?: string;
  mimeType?: string;
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
}

export interface BoundingBox {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
}

export interface FurnitureItem {
    name: string;
    description: string;
    store: string;
    price: string;
    purchaseUrl:string;
    boundingBox?: BoundingBox;
    thumbnailUrl?: string;
}

export interface PaintColor {
    name: string;
    hex: string;
    brand: string;
    brandColorName: string;
}

export interface PaletteColor {
    name: string;
    hex: string;
    brand?: string;
    brandColorName?: string;
}

export interface SavedPalette {
    id: string;
    name: string;
    colors: PaletteColor[];
}

export interface SavedProject {
  id: string;
  image: string; // base64 string
  projectName: string;
  roomTypeName: string;
  styleNames: string[];
  storeNames: string[];
  colorPalette?: string;
  furniture?: FurnitureItem[];
  paints?: PaintColor[];
  sources?: any[];
  designNotes?: string;
}