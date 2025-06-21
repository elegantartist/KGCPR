import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineQueueService } from "@/services/offlineQueueService";
import { generateHealthScoreAnalysis } from "@/lib/healthScoreAnalysis";
import NavigationRibbon from "@/components/NavigationRibbon";


const DailySelfScoresPage = () => {
  const [dietScore, setDietScore] = useState([5]);
  const [exerciseScore, setExerciseScore] = useState([5]);
  const [medicationScore, setMedicationScore] = useState([5]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisText, setAnalysisText] = useState('');

  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  const handleSubmit = async () => {
    setIsLoading(true);
    
    const requestBody = {
      dietScore: dietScore[0],
      exerciseScore: exerciseScore[0],
      medicationScore: medicationScore[0],
    };

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            title: "Already submitted today",
            description: data.message,
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.message || 'Failed to submit scores.');
      }

      toast({
        title: "Scores submitted successfully",
        description: "Thank you for your daily health update. You may submit again tomorrow.",
      });

      // Only show the general analysis dialog if a proactive suggestion was NOT sent
      if (!data.proactiveSuggestionSent) {
        setTimeout(() => setShowConfirmDialog(true), 500);
      }

    } catch (error) {
      // Check if this is a network error and we're offline
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      
      if (!isOnline || isNetworkError) {
        // Queue the request for later when back online
        offlineQueueService.addToQueue(
          '/api/scores',
          'POST',
          { 'Content-Type': 'application/json' },
          requestBody
        );
        
        toast({
          title: "Scores queued for submission",
          description: "You're offline. Your scores will be submitted automatically when you reconnect.",
          className: "bg-yellow-50 border-yellow-200 text-yellow-900"
        });
        
        // Still show confirmation dialog for offline submissions
        setTimeout(() => setShowConfirmDialog(true), 500);
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Could not submit scores. Please try again later.",
          variant: "destructive",
        });
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowAnalysis = () => {
    const analysis = generateHealthScoreAnalysis(
      dietScore[0], 
      exerciseScore[0], 
      medicationScore[0]
    );
    setAnalysisText(analysis);
    setShowConfirmDialog(false);
    setShowAnalysisDialog(true);
  };



  const formatMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-3">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mb-2 mt-4">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/\n/g, '<br />')
      .replace(/(<li.*?>.*?<\/li>)/g, '<ul class="mb-2">$1</ul>');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Navigation Ribbon */}
      <NavigationRibbon showLogout={false} userType="patient" />
      
      <div className="max-w-md mx-auto p-4 pt-6">

        <Card className="bg-white shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-800">Slide the Bars for Your Daily Self-Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Diet Score */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="diet-slider" className="text-sm font-medium text-gray-700">
                  Healthy Meal Plan
                </Label>
                <span className="text-xl font-bold text-green-600">{dietScore[0]}</span>
              </div>
              <div className="px-1">
                <Slider
                  id="diet-slider"
                  min={1}
                  max={10}
                  step={1}
                  value={dietScore}
                  onValueChange={setDietScore}
                  className="w-full slider-green"
                />
                {/* Numbered markers */}
                <div className="flex justify-between px-2 mt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <span key={num} className="text-xs text-gray-400 font-medium">{num}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Exercise Score */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="exercise-slider" className="text-sm font-medium text-gray-700">
                  Exercise and Wellness
                </Label>
                <span className="text-xl font-bold text-blue-600">{exerciseScore[0]}</span>
              </div>
              <div className="px-1">
                <Slider
                  id="exercise-slider"
                  min={1}
                  max={10}
                  step={1}
                  value={exerciseScore}
                  onValueChange={setExerciseScore}
                  className="w-full slider-blue"
                />
                {/* Numbered markers */}
                <div className="flex justify-between px-2 mt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <span key={num} className="text-xs text-gray-400 font-medium">{num}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Medication Score */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="medication-slider" className="text-sm font-medium text-gray-700">
                  Prescription Medication
                </Label>
                <span className="text-xl font-bold text-red-600">{medicationScore[0]}</span>
              </div>
              <div className="px-1">
                <Slider
                  id="medication-slider"
                  min={1}
                  max={10}
                  step={1}
                  value={medicationScore}
                  onValueChange={setMedicationScore}
                  className="w-full slider-red"
                />
                {/* Numbered markers */}
                <div className="flex justify-between px-2 mt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <span key={num} className="text-xs text-gray-400 font-medium">{num}</span>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={isLoading} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg mt-6"
            >
              {isLoading ? 'Submitting...' : 'Submit Daily Scores'}
            </Button>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-sm mx-auto bg-white border border-gray-200 shadow-lg">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <DialogTitle className="text-center">Analyse Your Health Scores?</DialogTitle>
                  <DialogDescription className="text-center text-gray-600">
                    Would you like to receive analysis of your health scores from the KGC Health Assistant? This can help you understand your progress and celebrate your progress.
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmDialog(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-100 text-gray-500"
                >
                  ✕
                </Button>
              </div>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-3 mt-6">
              <Button 
                onClick={handleShowAnalysis}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Yes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmDialog(false)}
                className="w-full"
              >
                No
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Analysis Dialog */}
        <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
          <DialogContent className="max-w-sm mx-auto bg-white border border-gray-200 shadow-lg">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <DialogTitle className="text-center">Your Health Score Analysis</DialogTitle>
                  <DialogDescription className="text-center text-gray-600">
                    A comprehensive analysis of your daily health scores.
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnalysisDialog(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-100 text-gray-500"
                >
                  ✕
                </Button>
              </div>
            </DialogHeader>
            
            {analysisText ? (
              <div className="mt-4">
                <div 
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(analysisText) }}
                />
                <DialogFooter className="mt-6">
                  <Button 
                    onClick={() => setShowAnalysisDialog(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-sm">Analysing your health scores...</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DailySelfScoresPage;