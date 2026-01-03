import html2canvas from 'html2canvas';

export const downloadGradeSheetAsPng = async (elementId: string, filename: string): Promise<boolean> => {
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
