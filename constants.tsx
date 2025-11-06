
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
  { id: 'ultra-modern', name: 'Ultra Modern' },
  { id: 'maximalist', name: 'Maximalist' },
  { id: 'architectural', name: 'Architectural' },
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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function BathIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5v-1.5a4.5 4.5 0 014.5-4.5h9a4.5 4.5 0 014.5 4.5v1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5v4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5v4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 16.5v1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 16.5v1.5" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.75H3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25H3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25V5.25a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25v3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12.75v6A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75v-6" />
    </svg>
  );
}

function KitchenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function OfficeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    );
}
