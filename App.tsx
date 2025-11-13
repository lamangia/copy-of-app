import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { FloorplanFile, PlacedItem, Wall } from './types';

const initialFloorplan: FloorplanFile = {
    dimensions: { length: 15, width: 10, units: 'ft' },
    doors: 1,
    windows: 2,
    placedItems: [],
};

const App: React.FC = () => {
    const [manualInputMode, setManualInputMode] = useState<'simple' | 'detailed'>('simple');
    const [floorplan, setFloorplan] = useState<FloorplanFile>(initialFloorplan);
    const [draggedPaletteItem, setDraggedPaletteItem] = useState<PlacedItem | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ id: string, screenPos: { top: number, left: number } } | null>(null);
    const [draggingPlacedItem, setDraggingPlacedItem] = useState<{
        item: PlacedItem;
        isDragging: boolean;
        initialMousePos: { x: number; y: number; };
    } | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    const wasDragging = useRef(false);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedItem) return;

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                const step = 0.005; // 0.5% of the wall length

                setFloorplan(fp => {
                    if (!fp?.placedItems) return fp;

                    const updatedItems = fp.placedItems.map(item => {
                        if (item.id === selectedItem.id) {
                            const newPosition = Math.max(0, Math.min(1, item.position + direction * step));
                            return { ...item, position: newPosition };
                        }
                        return item;
                    });

                    return { ...fp, placedItems: updatedItems };
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedItem, setFloorplan]);


    const handleManualModeToggle = (mode: 'simple' | 'detailed') => {
        setManualInputMode(mode);
        setFloorplan(fp => {
            const common = { doors: fp?.doors ?? 1, windows: fp?.windows ?? 2, placedItems: [] };
            if (mode === 'simple') {
                return {
                    ...common,
                    detailedLayout: undefined,
                    dimensions: { length: 15, width: 10, units: 'ft' },
                };
            } else { // detailed
                return {
                    ...common,
                    dimensions: undefined,
                    detailedLayout: {
                        units: 'ft',
                        walls: Array.from({ length: 4 }, () => ({ length: 12, angle: 90 })),
                    },
                };
            }
        });
    };
    
    const handleAddItemsToPalette = () => {
        const doorCount = floorplan.doors ?? 0;
        const windowCount = floorplan.windows ?? 0;
        const units = floorplan.dimensions?.units || floorplan.detailedLayout?.units || 'ft';

        const initialItems: PlacedItem[] = [];
        for (let i = 0; i < doorCount; i++) {
            initialItems.push({ id: `door_${i}`, type: 'door', wallIndex: -1, position: 0, width: units === 'ft' ? 3 : 0.9 });
        }
        for (let i = 0; i < windowCount; i++) {
            initialItems.push({ id: `window_${i}`, type: 'window', wallIndex: -1, position: 0, width: units === 'ft' ? 4 : 1.2 });
        }

        setFloorplan(fp => ({
            ...fp,
            placedItems: initialItems,
        }));
    };

    const handleWallCountChange = (count: number) => {
        const newCount = Math.max(3, Math.min(10, count || 3));
        const currentWalls = floorplan?.detailedLayout?.walls || [];
        const newWalls = Array.from({ length: newCount }, (_, i) => currentWalls[i] || { length: 10, angle: 90 });
        setFloorplan(fp => ({
            ...fp,
            dimensions: undefined,
            detailedLayout: {
                units: fp?.detailedLayout?.units || 'ft',
                walls: newWalls,
            },
        }));
    };

    const handleWallDetailChange = (index: number, field: 'length' | 'angle', value: number) => {
        setFloorplan(fp => {
            if (!fp?.detailedLayout) return fp;
            const updatedWalls = [...fp.detailedLayout.walls];
            updatedWalls[index] = { ...updatedWalls[index], [field]: value };
            return {
                ...fp,
                detailedLayout: {
                    ...fp.detailedLayout,
                    walls: updatedWalls,
                },
            };
        });
    };

    const { wallSegments, viewBox } = useMemo(() => {
        const walls: Wall[] = floorplan.detailedLayout?.walls 
            ? floorplan.detailedLayout.walls 
            : floorplan.dimensions ? [
                { length: floorplan.dimensions.length, angle: 90 },
                { length: floorplan.dimensions.width, angle: 90 },
                { length: floorplan.dimensions.length, angle: 90 },
                { length: floorplan.dimensions.width, angle: 90 },
            ] : [];

        if (walls.length === 0) return { wallSegments: [], viewBox: '0 0 100 100' };

        let points = [{x: 0, y: 0}];
        let angle = 0;
        let minX = 0, minY = 0, maxX = 0, maxY = 0;

        for (let i = 0; i < walls.length; i++) {
            const wall = walls[i];
            const lastPoint = points[i];
            
            const nextX = lastPoint.x + wall.length * Math.cos(angle);
            const nextY = lastPoint.y + wall.length * Math.sin(angle);
            points.push({ x: nextX, y: nextY });

            minX = Math.min(minX, nextX); minY = Math.min(minY, nextY);
            maxX = Math.max(maxX, nextX); maxY = Math.max(maxY, nextY);
            
            const turnAngle = (180 - wall.angle) * (Math.PI / 180);
            angle += turnAngle;
        }

        const bbWidth = maxX - minX;
        const bbHeight = maxY - minY;
        const padding = Math.max(bbWidth, bbHeight) * 0.1 + 5;
        
        const vbX = minX - padding;
        const vbY = minY - padding;
        const vbWidth = bbWidth + padding * 2;
        const vbHeight = bbHeight + padding * 2;
        
        const segments = points.slice(0, -1).map((p1, i) => ({ p1, p2: points[i+1], length: walls[i].length }));

        return {
            wallSegments: segments,
            viewBox: `${vbX} ${vbY} ${vbWidth} ${vbHeight}`
        };
    }, [floorplan.dimensions, floorplan.detailedLayout]);
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!draggingPlacedItem || !svgRef.current) return;
    
            // Phase 1: Initial move. Check threshold and officially start the drag.
            if (!draggingPlacedItem.isDragging) {
                const dx = e.clientX - draggingPlacedItem.initialMousePos.x;
                const dy = e.clientY - draggingPlacedItem.initialMousePos.y;
                if (Math.sqrt(dx * dx + dy * dy) < 5) { // Drag threshold
                    return; // Not a drag yet, do nothing
                }
                
                // Threshold met, start the drag.
                wasDragging.current = true;
                setSelectedItem(null); // Deselect on drag
                setDraggingPlacedItem(prev => prev ? { ...prev, isDragging: true } : null);
                return; // Return to wait for re-render with isDragging=true
            }
    
            // Phase 2: Actively dragging. Update position.
            const svg = svgRef.current;
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    
            let closestWallIndex = -1;
            let closestDistSq = Infinity;
            let newPosition = 0;
    
            wallSegments.forEach((wall, index) => {
                const { p1, p2 } = wall;
                const dx_w = p2.x - p1.x;
                const dy_w = p2.y - p1.y;
                const wallLengthSq = dx_w * dx_w + dy_w * dy_w;
    
                let t = 0;
                if (wallLengthSq !== 0) {
                    t = ((svgP.x - p1.x) * dx_w + (svgP.y - p1.y) * dy_w) / wallLengthSq;
                    t = Math.max(0, Math.min(1, t));
                }
    
                const closestPointOnSegment = { x: p1.x + t * dx_w, y: p1.y + t * dy_w };
                const distSq = (svgP.x - closestPointOnSegment.x) ** 2 + (svgP.y - closestPointOnSegment.y) ** 2;
    
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    closestWallIndex = index;
                    newPosition = t;
                }
            });
    
            const vbWidth = parseFloat(viewBox.split(' ')[2]);
            const SNAP_DISTANCE_SQ = (vbWidth * 0.05) ** 2;
    
            const unplaceItem = closestDistSq > SNAP_DISTANCE_SQ;
    
            setFloorplan(fp => {
                if (!fp?.placedItems) return fp;
                const updatedItems = fp.placedItems.map(i =>
                    i.id === draggingPlacedItem.item.id ? {
                        ...i,
                        wallIndex: unplaceItem ? -1 : closestWallIndex,
                        position: unplaceItem ? 0 : newPosition,
                    } : i
                );
                return { ...fp, placedItems: updatedItems };
            });
        };
    
        const handleMouseUp = () => {
            setDraggingPlacedItem(null);
        };
    
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingPlacedItem, wallSegments, viewBox]);
    
    const unplacedItems = floorplan?.placedItems?.filter(i => i.wallIndex === -1) || [];

    const handlePaletteDragStart = (e: React.DragEvent, item: PlacedItem) => {
        setDraggedPaletteItem(item);
    };

    const handleDropOnWall = (e: React.DragEvent, wallIndex: number) => {
        e.preventDefault();
        if (!draggedPaletteItem || !svgRef.current) return;
        
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        
        const wall = wallSegments[wallIndex];
        const { p1, p2 } = wall;
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const wallLengthSq = dx*dx + dy*dy;
        
        let t = (wallLengthSq === 0) ? 0 : (((svgP.x - p1.x) * dx + (svgP.y - p1.y) * dy) / wallLengthSq);
        t = Math.max(0, Math.min(1, t)); // Clamp to segment

        setFloorplan(fp => {
            if (!fp?.placedItems) return fp;
            const updatedItems = fp.placedItems.map(item => 
                item.id === draggedPaletteItem.id ? { ...item, wallIndex, position: t } : item
            );
            return { ...fp, placedItems: updatedItems };
        });
        setDraggedPaletteItem(null);
    };
    
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    
    const handleItemWidthChange = (itemId: string, newWidth: number) => {
        setFloorplan(fp => {
            if (!fp?.placedItems) return fp;
            const updatedItems = fp.placedItems.map(item => 
                item.id === itemId ? { ...item, width: newWidth } : item
            );
            return { ...fp, placedItems: updatedItems };
        });
    };

    const handleItemMouseDown = (e: React.MouseEvent, item: PlacedItem) => {
        e.preventDefault();
        e.stopPropagation();
        wasDragging.current = false;
        setDraggingPlacedItem({
            item: item,
            isDragging: false,
            initialMousePos: { x: e.clientX, y: e.clientY },
        });
    };
    
    const ItemIcon = ({type}: {type: 'door' | 'window'}) => (
        type === 'door' ? 
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v10m8-10v10m-8 0h8M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> :
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
    );

    const units = floorplan.dimensions?.units || floorplan.detailedLayout?.units || 'ft';

    return (
        <div className="min-h-screen bg-stone-100 flex flex-col" onClick={() => setSelectedItem(null)}>
            <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row flex-grow my-4 bg-white shadow-xl rounded-lg overflow-hidden">
                {/* Input Panel */}
                <aside className="w-full md:w-96 p-6 border-r border-stone-200 overflow-y-auto">
                    <header className="mb-6">
                        <h1 className="text-3xl font-serif text-slate-800">Floorplan Editor</h1>
                        <p className="text-slate-500 mt-2">Design your room layout interactively.</p>
                    </header>
                    
                    <div className="flex w-full mb-4 rounded-lg bg-stone-200 p-1">
                        <button onClick={() => handleManualModeToggle('simple')} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition ${manualInputMode === 'simple' ? 'bg-white shadow' : 'text-slate-600'}`}>
                            Simple
                        </button>
                        <button onClick={() => handleManualModeToggle('detailed')} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition ${manualInputMode === 'detailed' ? 'bg-white shadow' : 'text-slate-600'}`}>
                            Detailed
                        </button>
                    </div>

                    {manualInputMode === 'simple' ? (
                        <div className="w-full space-y-4 text-left">
                            <div>
                                <label className="font-semibold text-slate-700">Dimensions</label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <input type="number" value={floorplan.dimensions?.length || ''} onChange={e => {
                                        const length = parseInt(e.target.value, 10) || 0;
                                        setFloorplan(fp => ({ ...fp, dimensions: { ...(fp.dimensions!), length } }));
                                    }} className="w-full p-2 bg-stone-100 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500" placeholder="Length" />
                                    <span className="text-slate-500">x</span>
                                    <input type="number" value={floorplan.dimensions?.width || ''} onChange={e => {
                                        const width = parseInt(e.target.value, 10) || 0;
                                        setFloorplan(fp => ({ ...fp, dimensions: { ...(fp.dimensions!), width } }));
                                    }} className="w-full p-2 bg-stone-100 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500" placeholder="Width" />
                                    <select value={units} onChange={e => {
                                        const newUnits = e.target.value as 'ft' | 'm';
                                        setFloorplan(fp => ({ ...fp, dimensions: { ...(fp.dimensions!), units: newUnits } }));
                                    }} className="p-2 bg-stone-100 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500">
                                        <option value="ft">ft</option>
                                        <option value="m">m</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full space-y-4 text-left">
                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="wall-count" className="font-semibold text-slate-700">Walls</label>
                                    <select value={units} onChange={e => {
                                        const newUnits = e.target.value as 'ft' | 'm';
                                        setFloorplan(fp => ({ ...fp, detailedLayout: { ...(fp.detailedLayout!), units: newUnits } }));
                                    }} className="p-1 bg-stone-100 border border-stone-300 rounded-lg text-sm focus:ring-1 focus:ring-slate-500">
                                        <option value="ft">ft</option>
                                        <option value="m">m</option>
                                    </select>
                                </div>
                                <input id="wall-count" type="number" min="3" max="10" value={floorplan.detailedLayout?.walls.length || 0} onChange={e => handleWallCountChange(parseInt(e.target.value, 10))} className="w-full p-2 mt-1 bg-stone-100 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500" />
                            </div>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                {floorplan.detailedLayout?.walls.map((wall, index) => (
                                    <div key={index} className="grid grid-cols-5 gap-2 items-center">
                                        <label className="col-span-1 text-sm font-medium text-slate-600">W{index+1}</label>
                                        <input type="number" placeholder="Length" value={wall.length} onChange={e => handleWallDetailChange(index, 'length', parseInt(e.target.value, 10) || 0)} className="col-span-2 w-full p-2 bg-stone-100 border border-stone-300 rounded-lg" />
                                        <input type="number" placeholder="Angle" value={wall.angle} onChange={e => handleWallDetailChange(index, 'angle', parseInt(e.target.value, 10) || 0)} className="col-span-2 w-full p-2 bg-stone-100 border border-stone-300 rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="border-t border-stone-200 mt-6 pt-6">
                        <label className="font-semibold text-slate-700">Items</label>
                        <div className="grid grid-cols-2 gap-4 w-full mt-2">
                            <div>
                                <label htmlFor="doors" className="font-medium text-slate-600 block text-sm">Doors</label>
                                <input id="doors" type="number" value={floorplan.doors ?? 1} onChange={e => {
                                    const doors = parseInt(e.target.value, 10) || 0;
                                    setFloorplan(fp => ({ ...fp, doors, placedItems: [] }));
                                }} min="0" max="10" className="w-full p-2 mt-1 bg-stone-100 border border-stone-300 rounded-lg" />
                            </div>
                            <div>
                                <label htmlFor="manual-windows" className="font-medium text-slate-600 block text-sm">Windows</label>
                                <input id="manual-windows" type="number" value={floorplan.windows ?? 2} onChange={e => {
                                    const windows = parseInt(e.target.value, 10) || 0;
                                    setFloorplan(fp => ({ ...fp, windows, placedItems: [] }));
                                }} min="0" max="10" className="w-full p-2 mt-1 bg-stone-100 border border-stone-300 rounded-lg" />
                            </div>
                        </div>
                         <button onClick={handleAddItemsToPalette} className="mt-4 w-full bg-slate-800 text-white py-2 rounded-lg font-semibold hover:bg-slate-700 transition">
                            Generate Items
                        </button>
                    </div>
                </aside>

                {/* Floorplan Panel */}
                <main className="flex-grow p-6 flex flex-col items-center justify-center bg-stone-50">
                    <div 
                        className="mb-6 p-4 bg-stone-100 rounded-lg w-full border-2 border-dashed border-stone-300 min-h-[100px]"
                        onDragOver={handleDragOver}
                    >
                        <h3 className="font-semibold text-slate-700 mb-2 text-center">Drag Your Items From Here</h3>
                        {unplacedItems.length > 0 ? (
                            <div className="flex flex-wrap gap-4 justify-center">
                                {unplacedItems.map(item => (
                                    <div key={item.id} draggable onDragStart={(e) => handlePaletteDragStart(e, item)} className="flex flex-col items-center cursor-grab p-2 bg-white rounded-md shadow-sm hover:shadow-md transition">
                                        <ItemIcon type={item.type} />
                                        <span className="text-xs text-slate-500 mt-1 capitalize">{item.type}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-4">Generate items in the side panel to begin.</p>
                        )}
                    </div>

                    <div className="w-full max-w-xl aspect-square p-2 bg-white rounded-lg border border-stone-200 shadow-sm relative">
                         <svg ref={svgRef} viewBox={viewBox} width="100%" height="100%">
                             <g>
                                {wallSegments.map((wall, wallIndex) => {
                                    const itemsOnWall = (floorplan.placedItems ?? [])
                                        .filter(item => item.wallIndex === wallIndex)
                                        .sort((a, b) => a.position - b.position);

                                    const wallVec = { x: wall.p2.x - wall.p1.x, y: wall.p2.y - wall.p1.y };
                                    const wallLength = wall.length;
                                    if (wallLength === 0) return null;
                                    const wallAngleRad = Math.atan2(wallVec.y, wallVec.x);
                                    
                                    const wallElements: React.ReactNode[] = [];
                                    let currentPositionRatio = 0;

                                    itemsOnWall.forEach(item => {
                                        const isSelected = selectedItem?.id === item.id;
                                        const itemHalfWidthRatio = (item.width / 2) / wallLength;
                                        const startRatio = Math.max(0, item.position - itemHalfWidthRatio);
                                        const endRatio = Math.min(1, item.position + itemHalfWidthRatio);

                                        if (startRatio > currentPositionRatio) {
                                            const p1 = { x: wall.p1.x + wallVec.x * currentPositionRatio, y: wall.p1.y + wallVec.y * currentPositionRatio };
                                            const p2 = { x: wall.p1.x + wallVec.x * startRatio, y: wall.p1.y + wallVec.y * startRatio };
                                            wallElements.push(<line key={`wall-${wallIndex}-seg-${currentPositionRatio}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#475569" strokeWidth="1" strokeLinecap="round" />);
                                        }

                                        const itemStartPoint = { x: wall.p1.x + wallVec.x * startRatio, y: wall.p1.y + wallVec.y * startRatio };
                                        const itemEndPoint = { x: wall.p1.x + wallVec.x * endRatio, y: wall.p1.y + wallVec.y * endRatio };
                                        
                                        const itemGroup = (
                                            <g 
                                                key={item.id} 
                                                className="cursor-grab"
                                                onMouseDown={(e) => handleItemMouseDown(e, item)}
                                                onClick={(e) => {
                                                    if (wasDragging.current) {
                                                        e.stopPropagation();
                                                        return;
                                                    }
                                                    e.stopPropagation();
                                                    const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
                                                    const containerRect = (e.currentTarget as SVGGElement).closest('.relative')?.getBoundingClientRect();
                                                    if (containerRect) {
                                                        setSelectedItem({
                                                            id: item.id,
                                                            screenPos: { top: rect.top - containerRect.top, left: rect.left - containerRect.left + rect.width / 2 }
                                                        });
                                                    }
                                                }}
                                            >
                                                {item.type === 'window' ? (
                                                    <>
                                                        <line x1={itemStartPoint.x} y1={itemStartPoint.y} x2={itemEndPoint.x} y2={itemEndPoint.y} stroke={isSelected ? '#6366f1' : '#475569'} strokeWidth="3" strokeLinecap="butt" />
                                                        <line x1={itemStartPoint.x} y1={itemStartPoint.y} x2={itemEndPoint.x} y2={itemEndPoint.y} stroke={isSelected ? '#a5b4fc' : '#c7d2fe'} strokeWidth="1" strokeLinecap="butt" />
                                                    </>
                                                ) : ( // Door
                                                    <>
                                                        <line 
                                                            x1={itemStartPoint.x} y1={itemStartPoint.y} 
                                                            x2={itemStartPoint.x + item.width * Math.cos(wallAngleRad - Math.PI / 4)} 
                                                            y2={itemStartPoint.y + item.width * Math.sin(wallAngleRad - Math.PI / 4)}
                                                            stroke={isSelected ? '#6366f1' : '#a16207'} strokeWidth={isSelected ? "1.5" : "1"}
                                                        />
                                                        <path 
                                                            d={`M ${itemEndPoint.x} ${itemEndPoint.y} A ${item.width} ${item.width} 0 0 0 ${itemStartPoint.x + item.width * Math.cos(wallAngleRad - Math.PI / 4)} ${itemStartPoint.y + item.width * Math.sin(wallAngleRad - Math.PI / 4)}`}
                                                            stroke={isSelected ? '#6366f1' : '#a16207'} strokeWidth={isSelected ? "1" : "0.5"} fill="none" strokeDasharray="2,2" 
                                                        />
                                                    </>
                                                )}
                                            </g>
                                        );

                                        wallElements.push(itemGroup);
                                        currentPositionRatio = endRatio;
                                    });

                                    if (currentPositionRatio < 1) {
                                        const p1 = { x: wall.p1.x + wallVec.x * currentPositionRatio, y: wall.p1.y + wallVec.y * currentPositionRatio };
                                        const p2 = wall.p2;
                                        wallElements.push(<line key={`wall-${wallIndex}-seg-end`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#475569" strokeWidth="1" strokeLinecap="round" />);
                                    }

                                    return (
                                        <g key={`wallgroup-${wallIndex}`}>
                                            {wallElements}
                                            <line
                                                key={`wall-interaction-${wallIndex}`}
                                                x1={wall.p1.x} y1={wall.p1.y}
                                                x2={wall.p2.x} y2={wall.p2.y}
                                                stroke="transparent"
                                                strokeWidth="10"
                                                onDrop={(e) => handleDropOnWall(e, wallIndex)}
                                                onDragOver={handleDragOver}
                                                className="hover:stroke-slate-900/10 transition-all"
                                            />
                                        </g>
                                    )
                                })}
                            </g>
                        </svg>
                        {selectedItem && (() => {
                            const item = floorplan.placedItems?.find(i => i.id === selectedItem.id);
                            if (!item) return null;
                            return (
                                <div 
                                    className="absolute bg-white p-2 rounded-lg shadow-lg border border-stone-200 z-10"
                                    style={{ top: selectedItem.screenPos.top, left: selectedItem.screenPos.left, transform: 'translate(-50%, -110%)' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Width ({units})</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        value={item.width}
                                        onChange={e => handleItemWidthChange(item.id, parseFloat(e.target.value) || 0)}
                                        className="w-20 text-center bg-slate-100 border-stone-300 rounded text-sm p-1"
                                        autoFocus
                                    />
                                </div>
                            )
                        })()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;