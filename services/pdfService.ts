import { jsPDF } from "jspdf";
import type { SavedProject } from '../types';

export const generateProjectPdf = async (project: SavedProject) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    const leftMargin = 15;
    const contentWidth = pageWidth - (leftMargin * 2);

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(project.projectName, leftMargin, yPos);
    yPos += 10;

    // Sub-title
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`${project.roomTypeName} | ${project.styleNames.join(', ')}`, leftMargin, yPos);
    yPos += 15;

    // Main Image
    const imgData = `data:image/png;base64,${project.image}`;
    const imgProps = doc.getImageProperties(imgData);
    const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
    if (yPos + imgHeight > pageHeight - 15) {
        doc.addPage();
        yPos = 20;
    }
    doc.addImage(imgData, 'PNG', leftMargin, yPos, contentWidth, imgHeight);
    yPos += imgHeight + 15;

    // Color Palette
    if (project.colorPalette) {
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('Color Palette', leftMargin, yPos);
        yPos += 8;

        const colors = project.colorPalette.split(',').map(c => c.trim());
        let xPos = leftMargin;
        colors.forEach(color => {
            const hexMatch = color.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
            const displayColor = hexMatch ? hexMatch[0] : '#ffffff';
            doc.setFillColor(displayColor);
            doc.setDrawColor(200); // Light grey border
            doc.rect(xPos, yPos, 15, 15, 'FD');
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            
            const colorName = doc.splitTextToSize(color, 30);
            doc.text(colorName, xPos, yPos + 20);
            xPos += 35; 
            if (xPos > contentWidth) { // Wrap colors to next line
                xPos = leftMargin;
                yPos += 25;
            }
        });
        yPos += 30;
    }

    // Paint Colors
    if (project.paints && project.paints.length > 0) {
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('Paint Colors', leftMargin, yPos);
        yPos += 8;
        
        project.paints.forEach(paint => {
            if (yPos > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFillColor(paint.hex);
            doc.setDrawColor(200);
            doc.rect(leftMargin, yPos, 10, 10, 'FD');
            
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(paint.brandColorName, leftMargin + 15, yPos + 4);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${paint.brand} - ${paint.name} (${paint.hex})`, leftMargin + 15, yPos + 9);
            yPos += 15;
        });
        yPos += 5; // Extra space before next section
    }

    // Shopping List
    if (project.furniture && project.furniture.length > 0) {
        if (yPos > pageHeight - 40) { // Check for title space
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('Shopping List', leftMargin, yPos);
        yPos += 10;
        
        project.furniture.forEach(item => {
            const itemHeight = 25; 
            if (yPos > pageHeight - itemHeight) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            const itemName = doc.splitTextToSize(item.name, contentWidth);
            doc.text(itemName, leftMargin, yPos);
            yPos += (itemName.length * 5);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${item.store} - ${item.price}`, leftMargin, yPos);
            yPos += 6;

            doc.setTextColor(0, 0, 255); // Blue for link
            doc.textWithLink('View Product', leftMargin, yPos, { url: item.purchaseUrl });
            doc.setTextColor(0, 0, 0); // Reset color
            yPos += 10;
        });

    } else {
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('Shopping List', leftMargin, yPos);
        yPos += 8;
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text('No furniture items have been identified for this design yet.', leftMargin, yPos);
    }

    doc.save(`${project.projectName.replace(/\s+/g, '_') || 'RoomGenius_Project'}.pdf`);
};