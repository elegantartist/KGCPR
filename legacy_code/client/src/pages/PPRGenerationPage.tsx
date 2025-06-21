import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Using standard textarea and div elements for now
import { Loader2, FileText, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/apiRequest';
import NavigationRibbon from '@/components/NavigationRibbon';

export default function PPRGenerationPage() {
  const [patientId, setPatientId] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  const [patientSummary, setPatientSummary] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const { toast } = useToast();

  const fetchPatientSummary = async () => {
    if (!patientId || isNaN(Number(patientId))) {
      toast({
        title: "Invalid Patient ID",
        description: "Please enter a valid patient ID number",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingSummary(true);
    try {
      const response = await fetch(`/api/reports/patient-summary/${patientId}`);
      const data = await response.json();

      if (data.success) {
        setPatientSummary(data.summary);
        toast({
          title: "Patient Summary Loaded",
          description: `Found data for ${data.summary.patient}`,
        });
      } else {
        toast({
          title: "Patient Not Found",
          description: data.error || "Unable to find patient data",
          variant: "destructive",
        });
        setPatientSummary(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch patient summary",
        variant: "destructive",
      });
      setPatientSummary(null);
    }
    setIsFetchingSummary(false);
  };

  const generatePPR = async () => {
    if (!patientId || isNaN(Number(patientId))) {
      toast({
        title: "Invalid Patient ID",
        description: "Please enter a valid patient ID number",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedReport('');

    try {
      const response: any = await apiRequest('POST', '/api/reports/generate-ppr', {
        patientId: Number(patientId),
      });

      if (response.success) {
        setGeneratedReport(response.report);
        toast({
          title: "PPR Generated Successfully",
          description: `Report generated for Patient ID ${patientId}`,
        });
      } else {
        toast({
          title: "Generation Failed",
          description: response.error || "Unable to generate PPR",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate Patient Progress Report",
        variant: "destructive",
      });
    }
    setIsGenerating(false);
  };

  const downloadReport = () => {
    if (!generatedReport) return;

    const blob = new Blob([generatedReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PPR-Patient-${patientId}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "PPR saved to your downloads folder",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <NavigationRibbon />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Patient Progress Report Generator
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Generate comprehensive AI-powered patient progress reports
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Patient Selection & Controls */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Patient Selection
                  </CardTitle>
                  <CardDescription>
                    Enter patient ID to generate their progress report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientId">Patient ID</Label>
                    <Input
                      id="patientId"
                      type="number"
                      placeholder="Enter patient ID"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={fetchPatientSummary}
                      disabled={isFetchingSummary || !patientId}
                      variant="outline"
                      className="flex-1"
                    >
                      {isFetchingSummary ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <User className="mr-2 h-4 w-4" />
                          Preview Patient
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={generatePPR}
                      disabled={isGenerating || !patientId}
                      className="flex-1"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate PPR
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Patient Summary Preview */}
              {patientSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Patient Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div><strong>Patient:</strong> {patientSummary.patient}</div>
                      <div><strong>Recent Scores:</strong> {patientSummary.recentScores}</div>
                      <div><strong>Recent Badges:</strong> {patientSummary.recentBadges}</div>
                      {patientSummary.lastActivity && (
                        <div><strong>Last Activity:</strong> {new Date(patientSummary.lastActivity).toLocaleDateString()}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {generatedReport && (
                <Card>
                  <CardHeader>
                    <CardTitle>Report Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={downloadReport} className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      Download Report
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Generated Report Display */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Generated Report
                  </CardTitle>
                  <CardDescription>
                    AI-generated comprehensive patient progress analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedReport ? (
                    <div className="space-y-4">
                      <textarea
                        value={generatedReport}
                        readOnly
                        className="w-full min-h-[600px] font-mono text-sm p-3 border rounded-md bg-gray-50 dark:bg-gray-800"
                        placeholder="Generated report will appear here..."
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[600px] text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No report generated yet</p>
                        <p className="text-sm">Enter a patient ID and click "Generate PPR"</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Patient Progress Reports are generated using AI analysis of patient health data, 
                including daily scores, achievements, and activity patterns. Reports are formatted 
                for healthcare provider review and care plan optimization.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}