
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import NavigationRibbon from "@/components/NavigationRibbon";
import { MessageCircle, BarChart, ArrowRight, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { useQuery } from "@tanstack/react-query";

// Health Image Carousel Component
const HealthImageCarousel = ({ className }: { className?: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // KGC Health Journey Images
  const images = [
    { 
      src: "/carousel-1.jpeg",
      alt: "KGC Health Support", 
      caption: "Start your health journey with KGC" 
    },
    { 
      src: "/carousel-2.jpeg",
      alt: "Lifestyle Prescription", 
      caption: "Professional lifestyle prescription support" 
    },
    { 
      src: "/carousel-3.jpeg",
      alt: "Personal Health Journey", 
      caption: "Your personal health transformation" 
    },
    { 
      src: "/carousel-4.jpeg",
      alt: "Wellness Support", 
      caption: "Comprehensive wellness guidance" 
    },
    { 
      src: "/carousel-5.jpeg",
      alt: "Health Goals", 
      caption: "Achieve your health goals with us" 
    },
    { 
      src: "/carousel-6.jpeg",
      alt: "KGC Assistance Zones", 
      caption: "Find your assistance zone" 
    },
    { 
      src: "/carousel-7.jpeg",
      alt: "Support Zones", 
      caption: "Dedicated support for your journey" 
    },
    { 
      src: "/carousel-8.jpeg",
      alt: "Health Transformation", 
      caption: "Transform your health with KGC" 
    },
  ];

  // Auto-rotation every 5 seconds
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (autoPlay) {
      intervalId = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 5000);
    }
    return () => clearInterval(intervalId);
  }, [autoPlay, images.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 30000);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 30000);
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <div className="relative w-full h-full">
        <img
          src={images[currentIndex].src}
          alt={images[currentIndex].alt}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="text-white text-sm md:text-base font-medium">
            {images[currentIndex].caption}
          </p>
        </div>
      </div>

      <button
        onClick={goToPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
      >
        <ChevronLeft className="h-4 w-4 text-gray-700" />
      </button>
      
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
      >
        <ChevronRight className="h-4 w-4 text-gray-700" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const HomePage = () => {
  const [showOrientationVideo, setShowOrientationVideo] = useState(false);
  
  // Fetch authenticated user data to display correct patient name
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => fetch('/api/auth/me', { credentials: 'include' }).then(res => res.json()).then(data => data.user)
  });

  const handleShowOrientationVideo = () => {
    console.log('HomePage: handleShowOrientationVideo called');
    setShowOrientationVideo(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navigation Ribbon with Orientation Link, KGC Logo, Menu, and Logout */}
      <NavigationRibbon 
        showLogout={true} 
        userType="patient" 
        onOrientationVideo={handleShowOrientationVideo}
      />

      {/* Orientation Video Overlay */}
      <Dialog open={showOrientationVideo} onOpenChange={setShowOrientationVideo}>
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0 bg-black border-0">
          <VisuallyHidden>
            <DialogTitle>KGC Patient Orientation Video</DialogTitle>
            <DialogDescription>
              Welcome orientation video explaining how to use the Keep Going Care platform effectively.
            </DialogDescription>
          </VisuallyHidden>
          <div className="relative w-full h-full">
            {/* Close Button */}
            <button
              onClick={() => setShowOrientationVideo(false)}
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            {/* Video Player */}
            <iframe
              src="https://www.youtube.com/embed/ET8aoaQjJn0?rel=0&showinfo=0&controls=1"
              title="KGC Patient Orientation Video"
              className="w-full h-full rounded-lg"
              frameBorder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            
            {/* Video Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-white text-xl font-bold mb-2">Welcome to Keep Going Care</h3>
              <p className="text-white/90 text-sm">
                Watch this orientation video to learn how to make the most of your KGC health journey.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Card className="border-blue-200/20 bg-[#fdfdfd]">
          <CardContent className="p-6">
            {/* Welcome Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#2E8BC0]">
                Welcome, {user?.name || 'Patient'}!
              </h1>
              <p className="text-gray-600 mt-2">
                Let's keep your health on track today.
              </p>
            </div>

            {/* Health Image Carousel */}
            <HealthImageCarousel className="h-[250px] sm:h-[280px] md:h-[300px] w-full mt-4 mb-6" />



            {/* Action Buttons */}
            <div className="space-y-4">
              {/* First Row - Chat and Keep Going */}
              <div className="grid grid-cols-2 gap-4">
                <Link href="/chatbot">
                  <Button className="w-full h-20 text-lg font-semibold text-white rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Chat
                  </Button>
                </Link>
                
                <Link href="/motivation">
                  <Button className="w-full h-20 text-lg font-semibold text-white rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                    Keep Going
                  </Button>
                </Link>
              </div>

              {/* Second Row - Daily Self-Scores */}
              <Link href="/daily-self-scores">
                <Button className="w-full h-16 text-lg font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <BarChart className="mr-2 h-5 w-5" />
                  Daily Self-Scores
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;