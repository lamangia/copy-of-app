// Fix: Removed unused GoogleGenAI import.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getColorPaletteRecommendation, generateRoomRendering, identifyAndFindFurniture, findSimilarFurniture } from './services/geminiService';
import { ROOM_TYPES, DESIGN_STYLES, TIERS, ROOM_DIRECTIONS, STORE_OPTIONS } from './constants';
import type { Room, Style, Tier, FloorplanFile, FurnitureItem, Store } from './types';
import StepIndicator from './components/StepIndicator';
import Loader from './components/Loader';

const TOTAL_STEPS = 7;

const App: React.FC = () => {
    const [step, setStep] = useState<number>(1);
    const [projectName, setProjectName] = useState<string>('');
    const [roomType, setRoomType] = useState<Room | null>(null);
    const [inputMethod, setInputMethod] = useState<'upload' | 'scan' | 'manual' | null>(null);
    const [imageInputType, setImageInputType] = useState<'floorplan' | 'photo' | null>(null);
    const [manualInputMode, setManualInputMode] = useState<'simple' | 'detailed'>('simple');
    const [floorplanImage, setFloorplanImage] = useState<FloorplanFile | null>(null);
    const [roomFacing, setRoomFacing] = useState<string>(ROOM_DIRECTIONS[0]);
    const [windowCount, setWindowCount] = useState<number>(2);
    const [colorPalette, setColorPalette] = useState<string>('');
    const [isRecommendingColor, setIsRecommendingColor] = useState<boolean>(false);
    const [designStyles, setDesignStyles] =useState<Style[]>([]);
    const [selectedStores, setSelectedStores] = useState<Store[]>([]);
    const [budget, setBudget] = useState<number>(5000);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // State for new subscription flow
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
    const [unlockedDesigns, setUnlockedDesigns] = useState<boolean>(false);
    
    // State for Project Dashboard
    const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);


    // State for Step 5: Shopping
    const [selectedImageForShopping, setSelectedImageForShopping] = useState<string | null>(null);
    const [isIdentifyingFurniture, setIsIdentifyingFurniture] = useState<boolean>(false);
    const [identifiedFurniture, setIdentifiedFurniture] = useState<FurnitureItem[]>([]);
    const [savedItems, setSavedItems] = useState<FurnitureItem[]>([]);
    const [cartItems, setCartItems] = useState<FurnitureItem[]>([]);
    const [hoveredItem, setHoveredItem] = useState<FurnitureItem | null>(null);

    // State for Similar Items
    const [isFindingSimilar, setIsFindingSimilar] = useState<boolean>(false);
    const [similarItems, setSimilarItems] = useState<FurnitureItem[]>([]);
    const [selectedItemForSimilar, setSelectedItemForSimilar] = useState<FurnitureItem | null>(null);

    // State for AR View
    const [arImageSrc, setArImageSrc] = useState<string | null>(null);
    const [arOpacity, setArOpacity] = useState<number>(0.7);


    const videoRef = useRef<HTMLVideoElement>(null);

    const handleNextStep = () => setStep(prev => prev + 1);
    const handlePrevStep = () => setStep(prev => prev > 1 ? prev - 1 : 1);

    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                setErrorMessage("Could not access camera. Please check permissions.");
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        if ((step === 3 && inputMethod === 'scan') || arImageSrc) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [step, inputMethod, arImageSrc]);
    
    // Prevent screenshots/content saving
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
            resolve({ data: base64Data, mimeType });
          };
          reader.onerror = (error) => reject(error);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const fileData = await fileToBase64(file);
                setFloorplanImage(fileData);
                handleNextStep();
            } catch (error) {
                setErrorMessage("Failed to process file.");
            }
        }
    };

    const handleManualFloorplanSubmit = () => {
        if (floorplanImage?.windows !== undefined) {
            setWindowCount(floorplanImage.windows); // Sync with step 3
        }
        handleNextStep();
    };
    
    const handleRecommendColor = async () => {
        if (!roomType || designStyles.length === 0) return;
        setIsRecommendingColor(true);
        setErrorMessage(null);
        try {
            const prompt = `Recommend a sophisticated color palette for a ${roomType.name} with a ${designStyles.map(s => s.name).join('/')} style. The room faces ${roomFacing} and has ${windowCount} windows. Provide 3-5 comma-separated color names (e.g., 'Navajo White, Sage Green, Terra Cotta').`;
            const recommendation = await getColorPaletteRecommendation(prompt);
            setColorPalette(recommendation.replace(/['"]+/g, ''));
        } catch (error) {
            setErrorMessage("Could not get color recommendations. Please try again.");
        } finally {
            setIsRecommendingColor(false);
        }
    };
    
    const handleGenerate = useCallback(async () => {
        if (!roomType) return;
        setIsGenerating(true);
        setGeneratedImages([]);
        setErrorMessage(null);
        handleNextStep();

        try {
            let floorplanPromptPart = 'Create a plausible and appealing room layout.';
            if (floorplanImage) {
                if (floorplanImage.data) {
                    if (imageInputType === 'photo') {
                        floorplanPromptPart = 'Redesign the room shown in the provided photograph. Keep the same general layout, window and door placement, and perspective. Replace the existing furniture, decor, and wall/floor treatments with new items that match the requested style.';
                    } else { // 'floorplan' or default
                        floorplanPromptPart = 'Base the room layout on the provided floor plan image.';
                    }
                } else if (floorplanImage.detailedLayout && floorplanImage.detailedLayout.walls.length > 0) {
                    const { units, walls } = floorplanImage.detailedLayout;
                    const wallDescriptions = walls.map((wall, i) => `Wall ${i+1} is ${wall.length}${units} long, followed by a ${wall.angle}-degree interior corner`).join('; ');
                    floorplanPromptPart = `The room has a custom shape with ${walls.length} walls. Starting from an arbitrary wall and going clockwise, the wall specifications are: ${wallDescriptions}. The room has ${floorplanImage.doors ?? 1} door(s). Base the room layout on these precise details.`;
                } else if (floorplanImage.dimensions) {
                    floorplanPromptPart = `The room is a simple rectangle, approximately ${floorplanImage.dimensions.length}${floorplanImage.dimensions.units} by ${floorplanImage.dimensions.width}${floorplanImage.dimensions.units}. It has ${floorplanImage.doors ?? 1} door(s). Base the room layout on these details.`;
                }
            }
            
            const stylePromptPart = designStyles.length > 0
                ? `The style is a mix of ${designStyles.map(s => s.name).join(', ')}.`
                : "The style should be a popular and tasteful one of the designer's choice.";

            const storePromptPart = selectedStores.length > 0
                ? `Crucially, the design must ONLY feature furniture and decor items that are realistically available for purchase from the following specific online stores: ${selectedStores.map(s => s.name).join(', ')}. Do not use items from any other retailers.`
                : 'The furniture and decor should be from popular, widely available online retailers.';

            const prompt = `Generate a photorealistic rendering of a remodeled ${roomType.name}. ${stylePromptPart} The primary color palette is ${colorPalette || 'designer\'s choice'}. The room faces ${roomFacing}, has ${windowCount} windows, and the budget is around $${budget}. The main goal is new furniture and decor. ${storePromptPart} ${floorplanPromptPart}`;
            
            const imageForRendering = floorplanImage?.data && floorplanImage.mimeType ? { data: floorplanImage.data, mimeType: floorplanImage.mimeType } : undefined;

            // Generate 3 images by default for the reveal screen
            const promises = Array.from({ length: 3 }).map(() => 
              generateRoomRendering(prompt, imageForRendering)
            );
            
            const results = await Promise.all(promises);
            setGeneratedImages(results);

        } catch (error) {
            setErrorMessage("An error occurred while generating images. Please try again.");
            setStep(5); // Go back to config step
        } finally {
            setIsGenerating(false);
        }
    }, [roomType, designStyles, colorPalette, roomFacing, windowCount, budget, floorplanImage, imageInputType, selectedStores]);

    const handleStyleSelect = (style: Style) => {
        setDesignStyles(prev => {
            if (prev.some(s => s.id === style.id)) {
                return prev.filter(s => s.id !== style.id);
            }
            if (prev.length < 3) {
                return [...prev, style];
            }
            // Optional: show a message that they can only select 3
            return prev;
        });
    };
    
    const createThumbnails = useCallback(async (mainImageSrc: string, items: FurnitureItem[]): Promise<FurnitureItem[]> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = `data:image/png;base64,${mainImageSrc}`;
            img.onload = () => {
                const itemsWithThumbnails = items.map(item => {
                    if (!item.boundingBox) {
                        return item;
                    }

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return item;

                    const { x_min, y_min, x_max, y_max } = item.boundingBox;
                    const naturalWidth = img.naturalWidth;
                    const naturalHeight = img.naturalHeight;

                    const cropX = x_min * naturalWidth;
                    const cropY = y_min * naturalHeight;
                    const cropWidth = (x_max - x_min) * naturalWidth;
                    const cropHeight = (y_max - y_min) * naturalHeight;

                    canvas.width = cropWidth;
                    canvas.height = cropHeight;

                    ctx.drawImage(
                        img,
                        cropX,
                        cropY,
                        cropWidth,
                        cropHeight,
                        0,
                        0,
                        cropWidth,
                        cropHeight
                    );

                    return {
                        ...item,
                        thumbnail: canvas.toDataURL('image/png')
                    };
                });
                resolve(itemsWithThumbnails);
            };
            img.onerror = () => {
                resolve(items); // if image fails to load, return original items
            };
        });
    }, []);

    const handleShopThisLook = async (imageSrc: string) => {
        if (!roomType || designStyles.length === 0) return;
        
        setSelectedImageForShopping(imageSrc);
        setIsIdentifyingFurniture(true);
        setIdentifiedFurniture([]); // Clear previous results
        setErrorMessage(null);
        setStep(7); // Move to the new step immediately to show a loader there
    
        try {
            const styleNames = designStyles.map(s => s.name);
            const storeNames = selectedStores.map(s => s.name);
            const furniture = await identifyAndFindFurniture(imageSrc, roomType.name, styleNames, storeNames);
            const furnitureWithThumbnails = await createThumbnails(imageSrc, furniture);
            setIdentifiedFurniture(furnitureWithThumbnails);
        } catch (error)
 {
            setErrorMessage("Could not identify furniture in this image. Please try another one.");
            setStep(6); // Go back to the results
        } finally {
            setIsIdentifyingFurniture(false);
        }
    };

    const handleSaveItem = (item: FurnitureItem) => {
        if (!savedItems.some(saved => saved.purchaseUrl === item.purchaseUrl)) {
            setSavedItems(prev => [...prev, item]);
        }
    };

    const handleRemoveItem = (itemUrl: string) => {
        setSavedItems(prev => prev.filter(item => item.purchaseUrl !== itemUrl));
    };

    const handleAddToCart = (item: FurnitureItem) => {
        if (!cartItems.some(cartItem => cartItem.purchaseUrl === item.purchaseUrl)) {
            setCartItems(prev => [...prev, item]);
        }
    };

    const handleFindSimilar = async (item: FurnitureItem) => {
        setSelectedItemForSimilar(item);
        setIsFindingSimilar(true);
        setSimilarItems([]);
        setErrorMessage(null);
        try {
            const results = await findSimilarFurniture(item);
            setSimilarItems(results);
        } catch (error) {
            setErrorMessage("Could not find similar items. Please try again.");
        } finally {
            setIsFindingSimilar(false);
        }
    };
    
    // Simulate subscription
    const handleSubscribe = () => {
        setUnlockedDesigns(true);
        setIsSubscriptionModalOpen(false);
    };

    const addWatermark = (base64Image: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = `data:image/png;base64,${base64Image}`;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
    
                canvas.width = img.width;
                canvas.height = img.height;
    
                ctx.drawImage(img, 0, 0);
    
                const watermarkText = 'RoomGenius AI';
                ctx.font = `bold ${Math.max(24, canvas.width / 40)}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.fillText(watermarkText, canvas.width / 2, canvas.height / 2);
    
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => {
                reject(new Error('Failed to load image for watermarking.'));
            };
        });
    };
    
    const handleSaveDesign = async (base64Image: string) => {
        try {
            const watermarkedDataUrl = await addWatermark(base64Image);
            const link = document.createElement('a');
            link.href = watermarkedDataUrl;
            link.download = `roomgenius-design-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error saving design:", error);
            setErrorMessage("Could not save the design. Please try again.");
        }
    };

    const renderHeader = (title: string, subtitle: string) => (
        <div className="text-center p-4 mb-4">
            <h1 className="text-3xl font-serif text-slate-800">{title}</h1>
            <p className="text-slate-500 mt-2">{subtitle}</p>
        </div>
    );
    
    const renderStep1 = () => (
        <div className="p-4 flex flex-col items-center justify-center flex-grow">
            {renderHeader("Name Your Project", "Give your project a name so you can easily find it later.")}
            <div className="w-full max-w-sm">
                <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g., Living Room Makeover"
                    className="w-full p-3 border border-stone-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
                <button 
                    onClick={handleNextStep}
                    disabled={!projectName.trim()}
                    className="mt-6 w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    Start Project
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="p-4">
            {renderHeader("Let's Get Started", "Which room are you renovating?")}
            <div className="grid grid-cols-2 gap-4 mt-4">
                {ROOM_TYPES.map((room) => (
                    <button key={room.id} onClick={() => { setRoomType(room); handleNextStep(); }} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-slate-400 transition-all duration-200 aspect-square">
                        {room.icon}
                        <span className="mt-2 font-semibold text-slate-800">{room.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
    
    const handleManualModeToggle = (mode: 'simple' | 'detailed') => {
        setManualInputMode(mode);
        setFloorplanImage(fp => {
            const common = { doors: fp?.doors ?? 1, windows: fp?.windows ?? 2 };
            if (mode === 'simple') {
                return {
                    ...common,
                    dimensions: { length: 12, width: 12, units: 'ft' },
                };
            } else { // detailed
                return {
                    ...common,
                    detailedLayout: {
                        units: 'ft',
                        walls: Array.from({ length: 4 }, () => ({ length: 12, angle: 90 })),
                    },
                };
            }
        });
    };

    const renderStep3 = () => {
        const handleWallCountChange = (count: number) => {
            const newCount = Math.max(3, Math.min(10, count || 3));
            const currentWalls = floorplanImage?.detailedLayout?.walls || [];
            const newWalls = Array.from({ length: newCount }, (_, i) => currentWalls[i] || { length: 10, angle: 90 });
            setFloorplanImage(fp => ({
                ...fp,
                dimensions: undefined,
                detailedLayout: {
                    units: fp?.detailedLayout?.units || 'ft',
                    walls: newWalls,
                },
            }));
        };

        const handleWallDetailChange = (index: number, field: 'length' | 'angle', value: number) => {
            setFloorplanImage(fp => {
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

        return (
            <div className="p-4 flex flex-col items-center">
                {renderHeader("Provide Your Layout", "How do you want to start?")}
                {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}
                {inputMethod === 'scan' ? (
                    <div className="w-full max-w-sm flex flex-col items-center">
                        <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg bg-slate-900 aspect-video mb-4 shadow-inner"></video>
                        <button onClick={handleNextStep} className="w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition">Scan & Continue</button>
                        <button onClick={() => setInputMethod(null)} className="mt-2 text-slate-600">Back</button>
                    </div>
                ) : inputMethod === 'manual' ? (
                    <div className="w-full max-w-sm flex flex-col items-center">
                        <div className="flex w-full mb-4 rounded-lg bg-stone-200 p-1">
                            <button onClick={() => handleManualModeToggle('simple')} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition ${manualInputMode === 'simple' ? 'bg-white shadow' : 'text-slate-600'}`}>
                                Simple (Rectangle)
                            </button>
                            <button onClick={() => handleManualModeToggle('detailed')} className={`w-1/2 p-2 rounded-md text-sm font-semibold transition ${manualInputMode === 'detailed' ? 'bg-white shadow' : 'text-slate-600'}`}>
                                Detailed (Custom)
                            </button>
                        </div>

                        {manualInputMode === 'simple' ? (
                            <div className="w-full space-y-4 text-left">
                                <div>
                                    <label className="font-semibold text-slate-700">Room Dimensions</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <input type="number" value={floorplanImage?.dimensions?.length || ''} onChange={e => {
                                            const length = parseInt(e.target.value, 10) || 0;
                                            setFloorplanImage(fp => ({ ...(fp!), dimensions: { ...(fp!.dimensions!), length } }));
                                        }} className="w-full p-2 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" placeholder="Length" />
                                        <span className="text-slate-500">x</span>
                                        <input type="number" value={floorplanImage?.dimensions?.width || ''} onChange={e => {
                                            const width = parseInt(e.target.value, 10) || 0;
                                            setFloorplanImage(fp => ({ ...(fp!), dimensions: { ...(fp!.dimensions!), width } }));
                                        }} className="w-full p-2 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" placeholder="Width" />
                                        <select value={floorplanImage?.dimensions?.units || 'ft'} onChange={e => {
                                            const units = e.target.value as 'ft' | 'm';
                                            setFloorplanImage(fp => ({ ...(fp!), dimensions: { ...(fp!.dimensions!), units } }));
                                        }} className="p-2 border border-stone-300 rounded-lg bg-white focus:ring-1 focus:ring-slate-500 focus:border-slate-500">
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
                                        <label htmlFor="wall-count" className="font-semibold text-slate-700">Number of Walls</label>
                                        <select value={floorplanImage?.detailedLayout?.units || 'ft'} onChange={e => {
                                            const units = e.target.value as 'ft' | 'm';
                                            setFloorplanImage(fp => ({ ...fp, detailedLayout: { ...(fp!.detailedLayout!), units } }));
                                        }} className="p-1 border border-stone-300 rounded-lg bg-white text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500">
                                            <option value="ft">ft</option>
                                            <option value="m">m</option>
                                        </select>
                                    </div>
                                    <input id="wall-count" type="number" min="3" max="10" value={floorplanImage?.detailedLayout?.walls.length || 0} onChange={e => handleWallCountChange(parseInt(e.target.value, 10))} className="w-full p-2 mt-1 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" />
                                </div>
                                <div className="space-y-3 max-h-40 overflow-y-auto pr-2 -mr-2">
                                    {floorplanImage?.detailedLayout?.walls.map((wall, index) => (
                                        <div key={index} className="grid grid-cols-5 gap-2 items-center">
                                            <label className="col-span-1 text-sm font-medium text-slate-600">W{index+1}</label>
                                            <input type="number" placeholder="Length" value={wall.length} onChange={e => handleWallDetailChange(index, 'length', parseInt(e.target.value, 10) || 0)} className="col-span-2 w-full p-2 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" />
                                            <input type="number" placeholder="Angle" value={wall.angle} onChange={e => handleWallDetailChange(index, 'angle', parseInt(e.target.value, 10) || 0)} className="col-span-2 w-full p-2 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 w-full mt-4">
                            <div>
                                <label htmlFor="doors" className="font-semibold text-slate-700 block">Doors</label>
                                <input id="doors" type="number" value={floorplanImage?.doors ?? 1} onChange={e => {
                                    const doors = parseInt(e.target.value, 10) || 0;
                                    setFloorplanImage(fp => ({ ...(fp!), doors }));
                                }} min="0" max="10" className="w-full p-2 mt-1 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" />
                            </div>
                            <div>
                                <label htmlFor="manual-windows" className="font-semibold text-slate-700 block">Windows</label>
                                <input id="manual-windows" type="number" value={floorplanImage?.windows ?? 2} onChange={e => {
                                    const windows = parseInt(e.target.value, 10) || 0;
                                    setFloorplanImage(fp => ({ ...(fp!), windows }));
                                }} min="0" max="10" className="w-full p-2 mt-1 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" />
                            </div>
                        </div>

                        <button onClick={handleManualFloorplanSubmit} className="mt-6 w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition">Continue</button>
                        <button onClick={() => setInputMethod(null)} className="mt-2 text-slate-600">Back</button>
                    </div>
                ) : (
                    <div className="w-full max-w-sm space-y-4">
                         <label htmlFor="floorplan-upload" onClick={() => setImageInputType('floorplan')} className="block w-full text-center p-6 bg-white rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-400 transition">
                             <input id="floorplan-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                             <span className="text-slate-700 font-semibold">Upload Floorplan</span>
                             <p className="text-sm text-slate-500 mt-1">.jpg, .png recommended</p>
                        </label>
                         <label htmlFor="room-photo-upload" onClick={() => setImageInputType('photo')} className="block w-full text-center p-6 bg-white rounded-xl border border-stone-200 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-400 transition">
                             <input id="room-photo-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                             <span className="text-slate-700 font-semibold">Upload Room Photo</span>
                             <p className="text-sm text-slate-500 mt-1">From your camera roll</p>
                        </label>
                        <div className="text-center text-slate-500">or</div>
                        <button onClick={() => setInputMethod('scan')} className="w-full p-6 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-slate-400 transition">
                            <span className="text-slate-700 font-semibold">Scan with Camera (AR)</span>
                            <p className="text-sm text-slate-500 mt-1">Generate a rendering from your room</p>
                        </button>
                        <div className="text-center text-slate-500">or</div>
                        <button onClick={() => {
                            setInputMethod('manual');
                            handleManualModeToggle('simple');
                        }} className="w-full p-6 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-slate-400 transition">
                            <span className="text-slate-700 font-semibold">Enter Details Manually</span>
                            <p className="text-sm text-slate-500 mt-1">Provide dimensions and features</p>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const renderStep4 = () => (
        <div className="p-4">
            {renderHeader("Design Details", "Tell us about your space and style.")}
            <div className="space-y-6">
                <div>
                    <label className="font-semibold text-slate-700">Style Preference</label>
                    <p className="text-xs text-slate-500 mb-2">Select up to 3 styles.</p>
                    <div className="grid grid-cols-3 gap-2">
                        {DESIGN_STYLES.map(style => (
                            <button key={style.id} onClick={() => handleStyleSelect(style)} className={`p-2 rounded-lg text-sm transition border ${designStyles.some(s => s.id === style.id) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-stone-300'}`}>{style.name}</button>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="font-semibold text-slate-700">Color Palette</label>
                    <div className="flex items-center space-x-2 mt-2">
                        <input type="text" value={colorPalette} onChange={e => setColorPalette(e.target.value)} placeholder="e.g. Beige, Sage Green, Gold" className="w-full p-2 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" />
                        <button onClick={handleRecommendColor} disabled={designStyles.length === 0 || isRecommendingColor} className="p-2 bg-stone-100 text-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200">
                            {isRecommendingColor ? <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> : 'AI ✨'}
                        </button>
                    </div>
                     <button onClick={() => setColorPalette('')} className="mt-2 text-sm text-slate-500 hover:text-slate-800 transition">
                        ...or surprise me!
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="direction" className="font-semibold text-slate-700 block">Facing Direction</label>
                        <select id="direction" value={roomFacing} onChange={e => setRoomFacing(e.target.value)} className="w-full p-2 mt-1 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500 bg-white">
                            {ROOM_DIRECTIONS.map(dir => <option key={dir} value={dir}>{dir}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="windows" className="font-semibold text-slate-700 block">Windows</label>
                        <input id="windows" type="number" value={windowCount} onChange={e => setWindowCount(parseInt(e.target.value))} min="0" max="10" className="w-full p-2 mt-1 border border-stone-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500" />
                    </div>
                </div>

                <div>
                    <label htmlFor="budget" className="font-semibold text-slate-700">Budget: ${budget.toLocaleString()}</label>
                    <input id="budget" type="range" min="500" max="50000" step="500" value={budget} onChange={e => setBudget(parseInt(e.target.value))} className="w-full mt-1 accent-slate-700" />
                </div>
                
                <button onClick={handleNextStep} className="w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition">Continue</button>
            </div>
        </div>
    );

    const handleStoreSelect = (store: Store) => {
        setSelectedStores(prev => {
            if (prev.some(s => s.id === store.id)) {
                return prev.filter(s => s.id !== store.id);
            }
            if (prev.length < 3) {
                return [...prev, store];
            }
            return prev;
        });
    };

    const renderStoreSelectionStep = () => (
        <div className="p-4">
            {renderHeader("Choose Your Stores", "Select up to 3 retailers for your design.")}
            <div className="space-y-6">
                <div>
                    <div className="grid grid-cols-2 gap-3">
                        {STORE_OPTIONS.map(store => (
                            <button 
                                key={store.id} 
                                onClick={() => handleStoreSelect(store)} 
                                disabled={selectedStores.length >= 3 && !selectedStores.some(s => s.id === store.id)}
                                className={`p-3 text-center rounded-lg transition-all duration-200 border
                                    ${selectedStores.some(s => s.id === store.id) 
                                        ? 'bg-slate-800 text-white border-slate-800' 
                                        : 'bg-white text-slate-800 border-stone-300'}
                                    ${selectedStores.length >= 3 && !selectedStores.some(s => s.id === store.id)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:border-slate-500'}`
                                }
                            >
                                {store.name}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                        {selectedStores.length} of 3 selected.
                    </p>
                </div>
                <button 
                    onClick={handleGenerate} 
                    className="w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
                >
                    Generate My Designs
                </button>
            </div>
        </div>
    );
    
    const renderResultsStep = () => (
        <div className="p-4 flex-grow flex flex-col">
            {isGenerating ? (
                <Loader />
            ) : (
                <>
                    {renderHeader("Your New Room!", "Here are your AI-generated designs.")}
                    {errorMessage && <p className="text-red-500 mb-4 text-center">{errorMessage}</p>}
                    <div className="flex-grow overflow-y-auto space-y-6">
                        {generatedImages.map((imgSrc, index) => (
                            <div key={index} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                                <div className="relative">
                                    <img 
                                        src={`data:image/png;base64,${imgSrc}`} 
                                        alt={`Generated room design ${index + 1}`} 
                                        className={`w-full h-auto transition-all duration-300 ${index > 0 && !unlockedDesigns ? 'blur-lg' : 'blur-none'}`} 
                                    />
                                    {index > 0 && !unlockedDesigns && (
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <button onClick={() => setIsSubscriptionModalOpen(true)} className="bg-slate-800 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-slate-700 transition-transform hover:scale-105">
                                                Subscribe to Reveal
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {(index === 0 || unlockedDesigns) && (
                                    <div className="p-3 grid grid-cols-3 gap-2">
                                         <button onClick={() => handleSaveDesign(imgSrc)} className="w-full text-center py-2 px-3 text-sm font-semibold rounded-md bg-stone-100 text-slate-700 hover:bg-stone-200 transition border border-stone-200">
                                            Save Design
                                        </button>
                                        <button onClick={() => setArImageSrc(imgSrc)} className="w-full text-center py-2 px-3 text-sm font-semibold rounded-md bg-stone-100 text-slate-700 hover:bg-stone-200 transition border border-stone-200">
                                            View in AR
                                        </button>
                                        <button onClick={() => handleShopThisLook(imgSrc)} className="w-full text-center py-2 px-3 text-sm font-semibold rounded-md bg-stone-100 text-slate-700 hover:bg-stone-200 transition border border-stone-200">
                                            Shop this Look
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => { setStep(1); setProjectName(''); setGeneratedImages([]); setSavedItems([]); setUnlockedDesigns(false); setImageInputType(null); setSelectedStores([]); }} className="mt-4 w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition">Start a New Project</button>
                </>
            )}
        </div>
    );

    const renderShopStep = () => (
        <div className="p-4 flex-grow flex flex-col">
            {renderHeader("Shop The Look", "Add items to your cart or library.")}
             {isIdentifyingFurniture ? (
                <div className="flex-grow flex items-center justify-center">
                    <Loader />
                </div>
             ) : (
                <div className="flex-grow overflow-y-auto">
                    <div className="relative mb-4">
                        <img src={`data:image/png;base64,${selectedImageForShopping}`} alt="Selected room design" className="w-full h-auto rounded-lg shadow-md" />
                        {hoveredItem && hoveredItem.boundingBox && (
                            <div
                                className="absolute border-4 border-slate-600 bg-slate-600/30 transition-all duration-200 pointer-events-none rounded-md"
                                style={{
                                    left: `${hoveredItem.boundingBox.x_min * 100}%`,
                                    top: `${hoveredItem.boundingBox.y_min * 100}%`,
                                    width: `${(hoveredItem.boundingBox.x_max - hoveredItem.boundingBox.x_min) * 100}%`,
                                    height: `${(hoveredItem.boundingBox.y_max - hoveredItem.boundingBox.y_min) * 100}%`,
                                }}
                            />
                        )}
                    </div>
                    
                    <div className="space-y-4">
                         <div>
                            <h3 className="font-serif font-bold text-xl text-slate-800 mb-2">Recommended Items</h3>
                            {identifiedFurniture.length > 0 ? (
                                <div className="space-y-3">
                                {identifiedFurniture.map((item, index) => {
                                    const itemThumbnail = item.thumbnail || item.thumbnailUrl;
                                    return (
                                        <div 
                                            key={index}
                                            className="bg-white p-3 rounded-xl border border-stone-200"
                                            onMouseEnter={() => setHoveredItem(item)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                        >
                                            <div className="flex items-start space-x-4">
                                                {itemThumbnail ? (
                                                    <img src={itemThumbnail} alt={item.name} className="w-20 h-20 object-cover rounded-md border flex-shrink-0 bg-stone-100" />
                                                ) : (
                                                    <div className="w-20 h-20 bg-stone-100 rounded-md border flex-shrink-0 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="flex-grow flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">{item.name}</h4>
                                                        <p className="text-sm text-slate-500">{item.store} - <span className="font-medium text-slate-700">{item.price}</span></p>
                                                        <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                                                         <div className="flex items-center space-x-4 mt-2">
                                                            <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-600 hover:underline">View Product &rarr;</a>
                                                            <button onClick={() => handleFindSimilar(item)} className="text-sm font-semibold text-slate-600 hover:underline">Find Similar</button>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleSaveItem(item)} disabled={savedItems.some(i => i.purchaseUrl === item.purchaseUrl)} className="ml-2 py-1 px-3 text-sm font-semibold bg-white text-slate-700 rounded-md disabled:bg-stone-100 disabled:text-stone-500 transition whitespace-nowrap flex-shrink-0 border border-stone-300 disabled:border-stone-200">
                                                        {savedItems.some(i => i.purchaseUrl === item.purchaseUrl) ? 'Saved' : 'Save'}
                                                    </button>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleAddToCart(item)}
                                                disabled={cartItems.some(i => i.purchaseUrl === item.purchaseUrl)}
                                                className="mt-3 w-full bg-slate-800 text-white py-2 rounded-lg font-semibold hover:bg-slate-700 transition disabled:bg-stone-400 disabled:cursor-not-allowed"
                                            >
                                                {cartItems.some(i => i.purchaseUrl === item.purchaseUrl) ? 'Added to Cart' : 'Add to Cart'}
                                            </button>
                                        </div>
                                    );
                                })}
                                </div>
                            ) : <p className="text-slate-600 text-center p-4 bg-stone-100 rounded-lg">No individual items could be identified in this image.</p>}
                        </div>

                        <div>
                            <h3 className="font-serif font-bold text-xl text-slate-800 mt-6 mb-2">My Library {savedItems.length > 0 && `(${savedItems.length})`}</h3>
                            {savedItems.length > 0 ? (
                                <div className="space-y-3">
                                    {savedItems.map((item, index) => {
                                        const itemThumbnailUrl = item.thumbnail || item.thumbnailUrl;
                                        return (
                                            <div key={index} className="bg-white p-3 rounded-lg border border-stone-200 flex items-center space-x-3">
                                                {itemThumbnailUrl ? (
                                                    <img src={itemThumbnailUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md border flex-shrink-0 bg-stone-100" />
                                                ) : (
                                                    <div className="w-16 h-16 bg-stone-100 rounded-md border flex-shrink-0 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="flex-grow">
                                                    <h4 className="font-semibold text-sm text-slate-800">{item.name}</h4>
                                                    <p className="text-xs text-slate-500">{item.store} - {item.price}</p>
                                                </div>
                                                <button onClick={() => handleRemoveItem(item.purchaseUrl)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-slate-600 text-center p-4 bg-stone-100 rounded-lg">No items saved yet. Save items from your generated looks to see them here!</p>
                            )}
                        </div>
                    </div>
                </div>
             )}
        </div>
    );

    const renderARView = () => (
        <div className="fixed inset-0 bg-black z-50 flex flex-col" aria-modal="true" role="dialog">
            <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover" aria-hidden="true"></video>
            <img 
              src={`data:image/png;base64,${arImageSrc}`} 
              alt="AR Overlay of generated room design" 
              className="absolute top-0 left-0 w-full h-full object-contain mix-blend-screen pointer-events-none"
              style={{ opacity: arOpacity }}
            />
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setArImageSrc(null)} className="bg-white/50 backdrop-blur-sm text-black rounded-full p-3 shadow-lg hover:bg-white/80 transition" aria-label="Close AR View">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="http://www.w3.org/2000/svg" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/50 backdrop-blur-sm p-4 rounded-lg shadow-lg">
              <label htmlFor="opacity-slider" className="block text-sm font-medium text-slate-900 text-center">Adjust Transparency</label>
              <input 
                id="opacity-slider"
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={arOpacity}
                onChange={(e) => setArOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-300 rounded-lg appearance-none cursor-pointer mt-2 accent-slate-600"
                aria-label="Design transparency"
              />
            </div>
        </div>
    );
    
    const renderSimilarItemsModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <header className="p-4 border-b border-stone-200 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-serif font-bold text-slate-800">Similar to:</h2>
                        <p className="text-sm text-slate-600 truncate">{selectedItemForSimilar?.name}</p>
                    </div>
                    <button onClick={() => setSelectedItemForSimilar(null)} className="p-2 rounded-full hover:bg-stone-200" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="http://www.w3.org/2000/svg" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto p-4">
                    {isFindingSimilar ? (
                        <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                            <svg className="animate-spin h-10 w-10 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-slate-600">Searching for similar items...</p>
                        </div>
                    ) : errorMessage && similarItems.length === 0 ? (
                        <p className="text-red-500 text-center">{errorMessage}</p>
                    ) : similarItems.length > 0 ? (
                        <div className="space-y-4">
                            {similarItems.map((item, index) => (
                                <div key={index} className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-start space-x-4">
                                    {item.thumbnailUrl ? (
                                        <img src={item.thumbnailUrl} alt={item.name} className="w-20 h-20 object-cover rounded-md border flex-shrink-0 bg-white" />
                                    ) : (
                                        <div className="w-20 h-20 bg-stone-100 rounded-md border flex-shrink-0 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-400" fill="none" viewBox="http://www.w3.org/2000/svg" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-slate-900">{item.name}</h4>
                                        <p className="text-sm text-slate-500">{item.store} - <span className="font-medium text-slate-700">{item.price}</span></p>
                                        <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                                        <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-600 hover:underline mt-2 inline-block">View Product &rarr;</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-600 text-center">No similar items were found.</p>
                    )}
                </div>
            </div>
        </div>
    );
    
    const renderSubscriptionModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
                <header className="p-4 border-b border-stone-200 flex justify-between items-center">
                    <h2 className="text-xl font-serif font-bold text-slate-800">Unlock All Designs</h2>
                     <button onClick={() => setIsSubscriptionModalOpen(false)} className="p-2 rounded-full hover:bg-stone-200" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="http://www.w3.org/2000/svg" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="p-4 space-y-4">
                    {TIERS.map(t => (
                        <div key={t.id} className="w-full text-left p-4 border-2 rounded-lg border-stone-200 bg-white">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">{t.name} ({t.renderings} renderings)</h3>
                                <span className="font-bold text-slate-700">{t.price}</span>
                            </div>
                            <p className="text-slate-600 mt-1 text-sm">{t.description}</p>
                            <button onClick={handleSubscribe} className="mt-3 w-full bg-slate-800 text-white py-2 rounded-lg font-semibold hover:bg-slate-700 transition">Choose Plan</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const renderProjectDashboardModal = () => {
        let floorplanDetails = "Not defined yet";
        if (floorplanImage) {
            if (floorplanImage.data) {
                floorplanDetails = imageInputType === 'photo' ? "Based on uploaded photo" : "Based on uploaded floorplan";
            } else if (floorplanImage.detailedLayout) {
                floorplanDetails = `${floorplanImage.detailedLayout.walls.length} walls (Custom)`;
            } else if (floorplanImage.dimensions) {
                floorplanDetails = `${floorplanImage.dimensions.length}x${floorplanImage.dimensions.width} ${floorplanImage.dimensions.units} (Rectangle)`;
            }
        }
    
        const dashboardItems = [
            { name: "Floorplan", value: floorplanDetails },
            { name: "Palette", value: colorPalette || "Not defined yet" },
            { name: "Mood Board", value: "Coming Soon" },
            { name: "Furniture", value: `${identifiedFurniture.length} items found` },
            { name: "Saved Items", value: `${savedItems.length} items saved` },
            { name: "Image Library", value: `${generatedImages.length} images generated` },
        ];
    
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                    <header className="p-4 border-b border-stone-200 flex justify-between items-center flex-shrink-0">
                        <div>
                            <h2 className="text-lg font-serif font-bold text-slate-800">Project: {projectName}</h2>
                        </div>
                        <button onClick={() => setIsDashboardOpen(false)} className="p-2 rounded-full hover:bg-stone-200" aria-label="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="http://www.w3.org/2000/svg" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </header>
                    <div className="flex-grow overflow-y-auto p-4 space-y-3">
                        {dashboardItems.map(item => (
                            <div key={item.name} className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex justify-between items-center">
                                <span className="font-semibold text-slate-700">{item.name}</span>
                                <span className={`text-sm ${item.value === "Not defined yet" || item.value === "Coming Soon" ? "text-slate-400" : "text-slate-600 font-medium"}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderCurrentStep = () => {
        switch (step) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStoreSelectionStep();
            case 6: return renderResultsStep();
            case 7: return renderShopStep();
            default: return renderStep1();
        }
    };
    
    return (
        <div className="min-h-screen bg-stone-50 flex flex-col">
            {arImageSrc && renderARView()}
            {selectedItemForSimilar && renderSimilarItemsModal()}
            {isSubscriptionModalOpen && renderSubscriptionModal()}
            {isDashboardOpen && renderProjectDashboardModal()}
            <div className={`w-full max-w-md mx-auto bg-white shadow-2xl shadow-slate-200 flex flex-col flex-grow ${arImageSrc || selectedItemForSimilar || isSubscriptionModalOpen || isDashboardOpen ? 'hidden' : ''}`}>
                <header className="flex items-center justify-between p-2 border-b border-stone-200">
                    <div className="w-10 flex-shrink-0">
                        {step > 1 && <button onClick={handlePrevStep} className="p-2 rounded-full hover:bg-stone-200 w-10 h-10 flex items-center justify-center text-xl">&larr;</button>}
                    </div>
                    <div className="flex-grow text-center">
                        {step > 1 && projectName ? (
                            <div className="flex items-center justify-center">
                                <span className="font-semibold text-sm text-slate-700 truncate max-w-[120px]">{projectName}</span>
                                <button onClick={() => setIsDashboardOpen(true)} className="ml-2 p-1.5 rounded-full hover:bg-stone-200" aria-label="Open Project Dashboard">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                             <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
                        )}
                    </div>
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        {cartItems.length > 0 && (
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="http://www.w3.org/2000/svg" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                                    {cartItems.length}
                                </span>
                            </div>
                        )}
                    </div>
                </header>
                <main className="flex-grow flex flex-col overflow-y-auto bg-stone-50">
                    <div className="flex-grow flex flex-col">
                        {step > 1 && (
                            <div className="flex-shrink-0">
                                <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
                            </div>
                        )}
                        <div className="flex-grow flex flex-col">
                           {renderCurrentStep()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
