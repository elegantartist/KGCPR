import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2, Upload, Camera } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiRequest';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import NavigationRibbon from "@/components/NavigationRibbon";
import PhotoUpload from '@/components/PhotoUpload';

// Physiological sigh video from provided YouTube link
const BREATHE_VIDEO_ID = 'bKYqK1R19hM';

const MotivationPage = () => {
  const [isFeatureVisible, setIsFeatureVisible] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [cachedImageUrl, setCachedImageUrl] = useState<string | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const isOnline = useOnlineStatus();

  // Load cached image URL from localStorage on component mount
  useEffect(() => {
    const cached = localStorage.getItem('kgcpr_cached_motivation_image');
    if (cached) {
      setCachedImageUrl(cached);
    }
  }, []);

  // Use React Query to fetch the motivational image URL from our new endpoint
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/motivation/image'],
    queryFn: () => apiRequest<{ imageUrl: string }>('GET', '/api/motivation/image'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: isOnline, // Only fetch when online
  });

  // Cache the image URL when successfully fetched while online
  useEffect(() => {
    if (data?.imageUrl && isOnline) {
      localStorage.setItem('kgcpr_cached_motivation_image', data.imageUrl);
      setCachedImageUrl(data.imageUrl);
    }
  }, [data, isOnline]);

  const handleKeepGoingClick = () => {
    setIsFeatureVisible(true);
    setVideoStarted(false);
  };

  const handleStartVideo = () => {
    setVideoStarted(true);
  };

  const handleUploadComplete = () => {
    setShowPhotoUpload(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-500">
        Error loading motivation feature. Please try again later.
      </div>
    );
  }

  // The URL for the patient's image, with offline fallback to cached version
  const motivationalImageUrl = data?.imageUrl || cachedImageUrl || '/KGCLogo.jpg';
  const hasCustomImage = motivationalImageUrl !== '/KGCLogo.jpg';
  


  if (showPhotoUpload) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-4 bg-gray-100">
        <div className="mb-6">
          <Button 
            onClick={() => setShowPhotoUpload(false)}
            variant="outline"
            className="mb-4"
          >
            ← Back to Motivation
          </Button>
        </div>
        <PhotoUpload onUploadComplete={handleUploadComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationRibbon showLogout={false} userType="patient" />
      <div className="flex flex-col flex-1 items-center justify-center p-4 text-center">
        {!isFeatureVisible ? (
          <div className="max-w-lg w-full space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Motivation Center</h2>
            <p className="text-gray-600 mb-8">
              {hasCustomImage 
                ? "Your personal motivational image is ready. Press Keep Going when you need support."
                : "Upload your personal motivational photo to enhance your breathing exercises."
              }
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleKeepGoingClick}
              className="h-24 w-full text-2xl font-bold bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transform hover:scale-105 transition-transform"
            >
              <Heart className="mr-4 h-8 w-8" />
              Keep Going
            </Button>

            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Personalize Your Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasCustomImage ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <img 
                        src={motivationalImageUrl} 
                        alt="Your motivational image" 
                        className="h-24 w-24 object-cover rounded-lg border-2 border-green-200"
                      />
                    </div>
                    <p className="text-sm text-green-700">Your motivational image is active with star enhancement</p>
                    <Button 
                      onClick={() => setShowPhotoUpload(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Add your personal motivational photo to appear during breathing exercises
                    </p>
                    <Button 
                      onClick={() => setShowPhotoUpload(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Motivational Photo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full max-w-full md:max-w-4xl aspect-[9/16] md:aspect-video rounded-lg overflow-hidden shadow-2xl bg-black">
          {!videoStarted ? (
            /* Start Screen with Preview */
            <div className="relative w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
              {/* Background preview of your image */}
              <div className="absolute inset-0 opacity-20">
                <img
                  src={motivationalImageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Start button and instructions */}
              <div className="relative z-10 text-center text-white p-8">
                <div className="mb-6">
                  <img
                    src={motivationalImageUrl}
                    alt="Your Personal Motivation"
                    className="w-32 h-32 object-cover rounded-full mx-auto mb-4 border-4 border-white shadow-2xl"
                  />
                </div>
                
                <h3 className="text-2xl font-bold mb-4">Ready for Your Breathing Exercise?</h3>
                <p className="text-lg mb-8 opacity-90">
                  This will play the physiological sigh video with your motivational image
                </p>
                
                <Button
                  onClick={handleStartVideo}
                  className="bg-green-500 hover:bg-green-600 text-white text-xl px-8 py-4 rounded-full shadow-lg transform hover:scale-105 transition-all"
                >
                  <Heart className="mr-3 h-6 w-6" />
                  Start Breathing Exercise
                </Button>
              </div>
            </div>
          ) : (
            /* Video Player with Your Image Overlay */
            <>
              <div className="absolute top-0 left-0 w-full h-full">
                <iframe
                  key={videoStarted ? 'started' : 'initial'} // Force reload when started
                  src={`https://www.youtube.com/embed/${BREATHE_VIDEO_ID}?autoplay=1&mute=1&loop=1&controls=1&modestbranding=1&rel=0&playlist=${BREATHE_VIDEO_ID}&start=0`}
                  title="Physiological Sigh Breathing Exercise"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>

              {/* Your MIP Image Overlay */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative">
                  <img
                    src={motivationalImageUrl}
                    alt="Your Personal Motivation"
                    className="max-h-[50vh] max-w-[80vw] object-contain rounded-lg shadow-2xl border-4 border-white/90 animate-pulse"
                    style={{
                      filter: 'brightness(1.1) contrast(1.1)',
                      boxShadow: '0 0 30px rgba(255, 255, 255, 0.5)'
                    }}
                  />
                  {/* Star enhancement overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-30">
                    <div className="absolute top-2 right-2 text-yellow-300 text-2xl animate-bounce">⭐</div>
                    <div className="absolute bottom-2 left-2 text-yellow-300 text-xl animate-pulse">⭐</div>
                    <div className="absolute top-1/2 left-2 text-yellow-300 text-lg animate-bounce delay-300">⭐</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Control buttons */}
          <div className="absolute bottom-5 right-5 flex gap-2 z-10">
            {videoStarted && (
              <Button
                onClick={() => setVideoStarted(false)}
                variant="outline"
                className="bg-white/90 text-black hover:bg-white shadow-lg mr-2"
              >
                Restart
              </Button>
            )}
            <Button
              onClick={() => setIsFeatureVisible(false)}
              className="bg-white/90 text-black hover:bg-white shadow-lg"
            >
              Done
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default MotivationPage;