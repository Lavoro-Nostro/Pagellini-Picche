import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import GradeSheetImage from '@/components/GradeSheetImage';

interface PlayerGradeData {
  player_name: string;
  voto_generale: number | null;
  [key: string]: string | number | null;
}

interface GradeSheetData {
  date: string;
  sheetType: 'classica' | 'dettagliata';
  grades: PlayerGradeData[];
  note?: string | null;
}

export const downloadGradeSheetAsPng = async (
  data: GradeSheetData,
  filename: string
): Promise<boolean> => {
  try {
    // Create a container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    // Render the component
    const root = createRoot(container);
    
    await new Promise<void>((resolve) => {
      root.render(
        <GradeSheetImage
          date={data.date}
          sheetType={data.sheetType}
          grades={data.grades}
          note={data.note}
        />
      );
      // Give it time to render
      setTimeout(resolve, 500);
    });

    const element = container.firstElementChild as HTMLElement;
    if (!element) {
      console.error('Element not found for screenshot');
      root.unmount();
      document.body.removeChild(container);
      return false;
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1a2e',
      scale: 1,
      logging: false,
      useCORS: true,
      width: 1080,
      height: 1920,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Cleanup
    root.unmount();
    document.body.removeChild(container);

    return true;
  } catch (error) {
    console.error('Error generating image:', error);
    return false;
  }
};

// Legacy function for backwards compatibility
export const downloadGradeSheetAsPngLegacy = async (elementId: string, filename: string): Promise<boolean> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found for screenshot');
      return false;
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1a2e',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    return true;
  } catch (error) {
    console.error('Error generating image:', error);
    return false;
  }
};
