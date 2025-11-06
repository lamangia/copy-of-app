
import React from 'react';
import type { Room, Style, Tier, Store } from './types';

export const ROOM_TYPES: Room[] = [
  { id: 'living-room', name: 'Living Room', icon: <SofaIcon /> },
  { id: 'bathroom', name: 'Bathroom', icon: <BathIcon /> },
  { id: 'bedroom', name: 'Bedroom', icon: <BedIcon /> },
  { id: 'kitchen', name: 'Kitchen', icon: <KitchenIcon /> },
  { id: 'home-office', name: 'Home Office', icon: <OfficeIcon /> },
];

export const DESIGN_STYLES: Style[] = [
  { id: 'mcm', name: 'Mid-Century Modern' },
  { id: 'modern-farmhouse', name: 'Modern Farmhouse' },
  { id: 'contemporary', name: 'Contemporary' },
  { id: 'minimalist', name: 'Minimalist' },
  { id: 'eclectic', name: 'Eclectic' },
  { id: 'japandi', name: 'Japandi' },
  { id: 'transitional', name: 'Transitional' },
  { id: 'boho', name: 'Boho' },
  { id: 'coastal', name: 'Coastal' },
  { id: 'classic', name: 'Classic' },
];

export const TIERS: Tier[] = [
    { id: 'basic', name: 'Basic', renderings: 3, price: '$5.99 / month', description: 'Perfect for initial ideas and concepts.' },
    { id: 'gold', name: 'Gold', renderings: 10, price: '$9.99 / month', description: 'Explore multiple variations and layouts.' },
    { id: 'platinum', name: 'Platinum', renderings: 100, price: '$29.99 / month', description: 'For comprehensive design exploration.' },
];

export const ROOM_DIRECTIONS: string[] = ['North', 'South', 'East', 'West'];

export const STORE_OPTIONS: Store[] = [
    { id: 'ikea', name: 'IKEA' },
    { id: 'walmart', name: 'Walmart' },
    { id: 'wayfair', name: 'Wayfair' },
    { id: 'west-elm', name: 'West Elm' },
    { id: 'living-spaces', name: 'Living Spaces' },
    { id: 'pottery-barn', name: 'Pottery Barn' },
    { id: 'crate-and-barrel', name: "Crate & Barrel" },
    { id: 'target', name: 'Target' },
    { id: 'williams-sonoma', name: 'Williams Sonoma' },
    { id: 'restoration-hardware', name: 'Restoration Hardware' },
    { id: 'ashley-furniture', name: 'Ashley Furniture' },
    { id: 'home-depot', name: 'Home Depot' },
    { id: 'magnolia', name: 'Magnolia.com' },
    { id: 'amazon', name: 'Amazon.com' },
    { id: 'chairish', name: 'Chairish.com' },
    { id: '1stdibs', name: '1stDibs.com' },
  ];

// Icon Components
function SofaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11v-2a2 2 0 012-2h10a2 2 0 012 2v2M5 11h14M5 11v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function BathIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6c-2.4 0-4.5 1.2-6 3v9h12v-9c-1.5-1.8-3.6-3-6-3zM4 9a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-4 9 4M3 7h18m-9 12v-4" />
    </svg>
  );
}

function KitchenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function OfficeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    );
}