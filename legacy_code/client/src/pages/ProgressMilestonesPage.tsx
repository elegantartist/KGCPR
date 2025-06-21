import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star, HelpCircle, Calendar, Target } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiRequest';
import { cn } from '@/lib/utils';
import NavigationRibbon from "@/components/NavigationRibbon";

interface PatientBadge {
  id: number;
  patientId: number;
  badgeName: string;
  badgeTier: string;
  earnedDate: string;
}

const badgeInfo = {
  "Healthy Meal Plan Hero": {
    icon: Trophy,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Consistent healthy eating habits"
  },
  "E&W Consistency Champion": {
    icon: Medal,
    color: "text-blue-600", 
    bgColor: "bg-blue-50",
    description: "Regular exercise and wellness routine"
  },
  "Medication Maverick": {
    icon: Award,
    color: "text-red-600",
    bgColor: "bg-red-50", 
    description: "Excellent medication adherence"
  }
};

const tierColors = {
  Bronze: "from-amber-600 to-amber-800",
  Silver: "from-gray-400 to-gray-600", 
  Gold: "from-yellow-400 to-yellow-600",
  Platinum: "from-purple-400 to-purple-600"
};

const tierRequirements = {
  Bronze: "14 consecutive days with scores ≥5",
  Silver: "28 consecutive days with scores ≥7", 
  Gold: "112 consecutive days with scores ≥8",
  Platinum: "168 consecutive days with scores ≥9"
};

const ProgressMilestonesPage = () => {
  const [selectedBadge, setSelectedBadge] = useState<PatientBadge | null>(null);
  const [showBadgeAnimation, setShowBadgeAnimation] = useState<PatientBadge | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/badges'],
    queryFn: () => apiRequest<{ badges: PatientBadge[] }>('GET', '/api/badges'),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  const earnedBadges = data?.badges || [];

  // Check for new badges in URL params (from navigation after earning)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newBadgeParam = urlParams.get('newBadge');
    if (newBadgeParam && earnedBadges.length > 0) {
      const latestBadge = earnedBadges[0];
      setShowBadgeAnimation(latestBadge);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [earnedBadges]);

  const BadgeCard = ({ badge, earned = false }: { badge: any; earned?: boolean }) => {
    const info = badgeInfo[badge.badgeName as keyof typeof badgeInfo];
    const Icon = info?.icon || Star;
    const tierColor = tierColors[badge.badgeTier as keyof typeof tierColors];

    return (
      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg",
          earned ? "bg-white" : "bg-gray-50 opacity-60",
          info?.bgColor
        )}
        onClick={() => earned && setSelectedBadge(badge)}
      >
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-10",
          tierColor
        )} />
        
        <CardContent className="p-6 text-center relative">
          <div className={cn(
            "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
            earned ? tierColor : "bg-gray-200",
            "bg-gradient-to-br"
          )}>
            <Icon className={cn(
              "h-8 w-8",
              earned ? "text-white" : "text-gray-400"
            )} />
          </div>
          
          <h3 className={cn(
            "font-semibold text-sm mb-2",
            earned ? "text-gray-900" : "text-gray-500"
          )}>
            {badge.badgeName}
          </h3>
          
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs font-medium",
              earned ? tierColor : "bg-gray-200 text-gray-500",
              earned && "bg-gradient-to-r text-white"
            )}
          >
            {badge.badgeTier}
          </Badge>
          
          {earned && (
            <p className="text-xs text-gray-600 mt-2">
              Earned {new Date(badge.earnedDate).toLocaleDateString()}
            </p>
          )}
          
          {!earned && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="text-center">
                <Target className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Not Earned</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading your achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center text-red-500">
          <Trophy className="h-12 w-12 mx-auto mb-4" />
          <p>Error loading badges. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Create all possible badges for display
  const allBadges = Object.keys(badgeInfo).flatMap(badgeName =>
    Object.keys(tierColors).map(tier => ({
      badgeName,
      badgeTier: tier,
      earned: earnedBadges.some(earned => 
        earned.badgeName === badgeName && earned.badgeTier === tier
      ),
      earnedData: earnedBadges.find(earned => 
        earned.badgeName === badgeName && earned.badgeTier === tier
      )
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationRibbon showLogout={false} userType="patient" />
      <div className="flex flex-col flex-1 p-4">
        <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-900">Progress Milestones</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  How it Works
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    How Badge System Works
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Badge Categories:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>🥗 Healthy Meal Plan Hero - Diet consistency</li>
                      <li>💪 E&W Consistency Champion - Exercise habits</li>
                      <li>💊 Medication Maverick - Adherence tracking</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Badge Tiers:</h4>
                    <ul className="space-y-1 text-gray-600">
                      {Object.entries(tierRequirements).map(([tier, req]) => (
                        <li key={tier}>
                          <span className="font-medium">{tier}:</span> {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-gray-600 text-xs">
                    Earn badges by maintaining consistent high scores in each health category!
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track your health journey achievements and celebrate your consistency milestones
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{earnedBadges.length}</p>
              <p className="text-sm text-gray-600">Total Badges</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {earnedBadges.length > 0 ? 
                  Math.floor((Date.now() - new Date(earnedBadges[earnedBadges.length - 1].earnedDate).getTime()) / (1000 * 60 * 60 * 24))
                  : 0}
              </p>
              <p className="text-sm text-gray-600">Days Since First Badge</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {earnedBadges.filter(b => b.badgeTier === 'Gold' || b.badgeTier === 'Platinum').length}
              </p>
              <p className="text-sm text-gray-600">Premium Badges</p>
            </CardContent>
          </Card>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allBadges.map((badge) => (
            <BadgeCard 
              key={`${badge.badgeName}-${badge.badgeTier}`}
              badge={badge.earnedData || badge}
              earned={badge.earned}
            />
          ))}
        </div>

        {earnedBadges.length === 0 && (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Start Your Journey</h3>
            <p className="text-gray-600 mb-4">
              Submit your daily scores consistently to earn your first badge!
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Submit Today's Scores
            </Button>
          </div>
        )}
        </div>
      </div>

      {/* Badge Award Animation Modal */}
      {showBadgeAnimation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-sm mx-4 animate-pulse">
            <div className="animate-bounce mb-4">
              <Trophy className="h-16 w-16 text-yellow-600 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Badge Unlocked!</h2>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {showBadgeAnimation.badgeName}
            </h3>
            <Badge className={cn(
              "mb-4 bg-gradient-to-r text-white",
              tierColors[showBadgeAnimation.badgeTier as keyof typeof tierColors]
            )}>
              {showBadgeAnimation.badgeTier}
            </Badge>
            <p className="text-gray-600 mb-6">Congratulations on your achievement!</p>
            <Button onClick={() => setShowBadgeAnimation(null)}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className={cn(
                "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-gradient-to-br",
                tierColors[selectedBadge.badgeTier as keyof typeof tierColors]
              )}>
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedBadge.badgeName}</h3>
              <Badge className={cn(
                "mb-4 bg-gradient-to-r text-white",
                tierColors[selectedBadge.badgeTier as keyof typeof tierColors]
              )}>
                {selectedBadge.badgeTier}
              </Badge>
              <p className="text-gray-600 mb-4">
                {badgeInfo[selectedBadge.badgeName as keyof typeof badgeInfo]?.description}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Earned on {new Date(selectedBadge.earnedDate).toLocaleDateString()}
              </p>
              <Button onClick={() => setSelectedBadge(null)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressMilestonesPage;