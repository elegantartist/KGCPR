import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Heart, 
  BarChart3, 
  Settings, 
  Plus, 
  FileText, 
  ExternalLink, 
  Loader2,
  Mail,
  Phone,
  Calendar,
  Save
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiRequest";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  assignedAt: string;
}

interface PatientFormData {
  name: string;
  email: string;
  phoneNumber: string;
}

interface CPDData {
  dietCpd: string;
  exerciseCpd: string;
  medicationCpd: string;
}

const DoctorDashboard = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [showPprModal, setShowPprModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatedPpr, setGeneratedPpr] = useState<string>("");
  const [patientForm, setPatientForm] = useState<PatientFormData>({
    name: "",
    email: "",
    phoneNumber: ""
  });
  const [cpdForm, setCpdForm] = useState<CPDData>({
    dietCpd: "",
    exerciseCpd: "",
    medicationCpd: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patients
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['/api/doctor/patients'],
    queryFn: () => apiRequest<{ success: boolean; patients: Patient[] }>('GET', '/api/doctor/patients')
  });

  // Fetch CPDs for selected patient
  const { data: cpdsData, isLoading: cpdsLoading } = useQuery({
    queryKey: ['/api/patients/cpds', selectedPatient?.id],
    queryFn: () => apiRequest<{ success: boolean; cpds: CPDData }>('GET', `/api/patients/${selectedPatient!.id}/cpds`),
    enabled: !!selectedPatient
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      return apiRequest<{ success: boolean; patient: Patient; message: string }>('POST', '/api/doctor/patients', data);
    },
    onSuccess: (data) => {
      toast({
        title: "Patient Created",
        description: data.message,
      });
      setShowCreatePatient(false);
      setPatientForm({ name: "", email: "", phoneNumber: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/patients'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Patient",
        description: error.message || "Failed to create patient",
        variant: "destructive"
      });
    }
  });

  // Save CPDs mutation
  const saveCpdsMutation = useMutation({
    mutationFn: async (data: CPDData) => {
      return apiRequest('POST', '/api/patients/' + selectedPatient!.id + '/cpds', data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "CPDs Saved",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients/cpds', selectedPatient?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving CPDs",
        description: error.message || "Failed to save Care Plan Directives",
        variant: "destructive"
      });
    }
  });

  // Generate PPR mutation
  const generatePprMutation = useMutation({
    mutationFn: async (patientId: number) => {
      return apiRequest('POST', '/api/doctor/patients/' + patientId + '/generate-ppr');
    },
    onSuccess: (data: any) => {
      setGeneratedPpr(data.report);
      setShowPprModal(true);
      toast({
        title: "PPR Generated",
        description: "Patient Progress Report has been successfully generated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Generating PPR",
        description: error.message || "Failed to generate Patient Progress Report",
        variant: "destructive"
      });
    }
  });

  // Update CPD form when data loads
  useEffect(() => {
    if (cpdsData?.cpds) {
      setCpdForm(cpdsData.cpds);
    }
  }, [cpdsData]);

  const handleCreatePatient = () => {
    if (!patientForm.name || !patientForm.email || !patientForm.phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    createPatientMutation.mutate(patientForm);
  };

  const handleSaveCpds = () => {
    if (!selectedPatient) return;
    saveCpdsMutation.mutate(cpdForm);
  };

  const handleGeneratePPR = () => {
    if (!selectedPatient) {
      toast({
        title: "No Patient Selected",
        description: "Please select a patient to generate a progress report.",
        variant: "destructive"
      });
      return;
    }
    
    generatePprMutation.mutate(selectedPatient.id);
  };

  const handleMiniClinicalAudit = () => {
    window.open('https://22405174-4230-4032-9823-eedd019cd641-00-2w4kfmy1qgza2.janeway.replit.dev/', '_blank');
  };

  const patients = patientsData?.patients || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <img 
              src="/KGCLogo.jpg" 
              alt="KGC Logo" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Doctor Dashboard</h1>
              <p className="font-bold text-[#1493cc]">Dr. Marijke Collins</p>
            </div>
          </div>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white dark:bg-white">
              <DialogHeader>
                <DialogTitle>Doctor Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Account Information</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div><strong>Name:</strong> Dr. Marijke Collins</div>
                    <div><strong>Email:</strong> marijke.collins@keepgoingcare.com</div>
                    <div><strong>Phone:</strong> +61412689104</div>
                  </div>
                </div>
                
                <div className="border-b pb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Dashboard Preferences</h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      PPR Generation
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Patient Management
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/auth/logout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        
                        if (response.ok) {
                          toast({
                            title: "Logged Out",
                            description: "You have been securely logged out"
                          });
                          window.location.href = '/';
                        }
                      } catch (error) {
                        toast({
                          title: "Logout Error",
                          description: "Please try again",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  My Patients ({patients.length})
                </CardTitle>
                
                <Dialog open={showCreatePatient} onOpenChange={setShowCreatePatient}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Patient
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Patient</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <input
                          id="name"
                          type="text"
                          value={patientForm.name}
                          onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Enter patient's full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <input
                          id="email"
                          type="email"
                          value={patientForm.email}
                          onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="patient@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <input
                          id="phone"
                          type="tel"
                          value={patientForm.phoneNumber}
                          onChange={(e) => setPatientForm({ ...patientForm, phoneNumber: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="+61 400 123 456"
                        />
                      </div>
                      <Button 
                        onClick={handleCreatePatient}
                        disabled={createPatientMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {createPatientMutation.isPending ? (
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </div>
                        ) : (
                          "Create Patient"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {patientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : patients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No patients assigned yet</p>
                    <p className="text-sm">Create your first patient to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {patients.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPatient?.id === patient.id
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{patient.name}</div>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {patient.email}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="w-3 h-3 mr-1" />
                          {patient.phoneNumber}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Patient Detail View */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <div className="space-y-6">
                {/* Patient Header */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Heart className="w-5 h-5 mr-2 text-red-600" />
                        {selectedPatient.name}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        Assigned: {new Date(selectedPatient.assignedAt).toLocaleDateString()}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email</Label>
                        <p className="text-gray-900">{selectedPatient.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Phone</Label>
                        <p className="text-gray-900">{selectedPatient.phoneNumber}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CPD Management Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-green-600" />
                      Care Plan Directives (CPDs)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cpdsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="diet-cpd" className="text-sm font-medium text-gray-700">
                            Diet Care Plan Directive
                          </Label>
                          <textarea
                            id="diet-cpd"
                            value={cpdForm.dietCpd}
                            onChange={(e) => setCpdForm({ ...cpdForm, dietCpd: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            rows={3}
                            placeholder="Enter diet recommendations and guidelines..."
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="exercise-cpd" className="text-sm font-medium text-gray-700">
                            Exercise Care Plan Directive
                          </Label>
                          <textarea
                            id="exercise-cpd"
                            value={cpdForm.exerciseCpd}
                            onChange={(e) => setCpdForm({ ...cpdForm, exerciseCpd: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            rows={3}
                            placeholder="Enter exercise recommendations and guidelines..."
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="medication-cpd" className="text-sm font-medium text-gray-700">
                            Medication Care Plan Directive
                          </Label>
                          <textarea
                            id="medication-cpd"
                            value={cpdForm.medicationCpd}
                            onChange={(e) => setCpdForm({ ...cpdForm, medicationCpd: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            rows={3}
                            placeholder="Enter medication recommendations and guidelines..."
                          />
                        </div>
                        
                        <Button
                          onClick={handleSaveCpds}
                          disabled={saveCpdsMutation.isPending}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {saveCpdsMutation.isPending ? (
                            <div className="flex items-center">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving CPDs...
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Save className="w-4 h-4 mr-2" />
                              Save CPDs
                            </div>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* PPR and MCA Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Patient Progress Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        Generate comprehensive progress analysis using AI insights
                      </p>
                      <Button
                        onClick={handleGeneratePPR}
                        disabled={generatePprMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {generatePprMutation.isPending ? (
                          <div className="flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating PPR...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Generate Patient Progress Report
                          </div>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Mini Clinical Audit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        Access external clinical audit tools and resources
                      </p>
                      <Button
                        onClick={handleMiniClinicalAudit}
                        variant="outline"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Mini Clinical Audit
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Patient Selected</h3>
                  <p className="text-gray-500 text-center">
                    Select a patient from the list on the left to view their details and manage their care plan directives.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Keep Going Care Platform. All rights reserved.</p>
        </div>

        {/* PPR Modal */}
        <Dialog open={showPprModal} onOpenChange={setShowPprModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Patient Progress Report - {selectedPatient?.name}
              </DialogTitle>
              <DialogDescription>
                Comprehensive health analysis and progress tracking for the selected patient
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Generated on: {new Date().toLocaleDateString()}</span>
                  <span>Analysis Period: Last 30 days</span>
                </div>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {generatedPpr}
                </div>
              </div>
              <div className="flex justify-end mt-6 space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigator.clipboard.writeText(generatedPpr)}
                >
                  Copy Report
                </Button>
                <Button onClick={() => setShowPprModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DoctorDashboard;