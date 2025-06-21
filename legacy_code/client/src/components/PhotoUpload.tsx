import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Star, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiRequest';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  onUploadComplete?: (imageUrl: string) => void;
}

const PhotoUpload = ({ onUploadComplete }: PhotoUploadProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: (imageData: string) => 
      apiRequest<{ success: boolean; imageUrl: string }>('POST', '/api/motivation/upload', { imageData }),
    onSuccess: (data) => {
      toast({
        title: "Photo uploaded successfully",
        description: "Your motivational image has been enhanced with star overlay",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/motivation/image'] });
      onUploadComplete?.(data.imageUrl);
      setSelectedImage(null);
      setIsProcessing(false);
    },
    onError: () => {
      toast({
        title: "Upload failed", 
        description: "Please try again with a different image",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  });

  const addStarOverlay = (imageDataURL: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Add star overlays
        const numStars = 8;
        for (let i = 0; i < numStars; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const size = 20 + Math.random() * 40;
          
          // Draw opaque star
          ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'; // Gold with opacity
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2;
          
          // Star shape
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const angle = (j * 4 * Math.PI) / 5;
            const radius = j % 2 === 0 ? size : size / 2;
            const starX = x + Math.cos(angle) * radius;
            const starY = y + Math.sin(angle) * radius;
            
            if (j === 0) ctx.moveTo(starX, starY);
            else ctx.lineTo(starX, starY);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        
        const enhancedDataURL = canvas.toDataURL('image/jpeg', 0.9);
        resolve(enhancedDataURL);
      };
      
      img.src = imageDataURL;
    });
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataURL);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const resizedImage = await resizeImage(file);
      setSelectedImage(resizedImage);
    } catch (error) {
      toast({
        title: "Image processing failed",
        description: "Please try a different image",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;
    
    setIsProcessing(true);
    
    try {
      // Apply star overlay enhancement before upload
      const enhancedImage = await addStarOverlay(selectedImage);
      uploadMutation.mutate(enhancedImage);
    } catch (error) {
      toast({
        title: "Enhancement failed",
        description: "Uploading original image instead",
      });
      uploadMutation.mutate(selectedImage);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="h-6 w-6 text-yellow-500" />
          <CardTitle className="text-lg">Upload Motivational Photo</CardTitle>
          <Star className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-sm text-gray-600">
          Add your personal motivation image. We'll enhance it with beautiful star overlay effects.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedImage ? (
          <div 
            onClick={triggerFileInput}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Click to select your photo</p>
            <p className="text-sm text-gray-500">JPG, PNG up to 5MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={selectedImage} 
                alt="Selected motivational image" 
                className="w-full h-48 object-cover rounded-lg"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <div className="text-white text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Adding star enhancement...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleUpload} 
                disabled={isProcessing || uploadMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Enhance & Save
                  </>
                )}
              </Button>
              
              <Button 
                onClick={triggerFileInput} 
                variant="outline"
                disabled={isProcessing}
              >
                Change
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>✨ Your photo will be enhanced with motivational star overlay</p>
          <p>🔒 Photos are securely stored and only visible to you</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoUpload;