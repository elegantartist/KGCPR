import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import NavigationRibbon from "@/components/NavigationRibbon";
import { Trash2 } from 'lucide-react';

// Define the shape of the Doctor object based on our schema
interface Doctor {
  id: number;
  name: string;
  email: string;
  phone: string;
  isSetupComplete: boolean;
  createdAt: string;
  patientCount?: number;
  patients?: Patient[];
}

interface Patient {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  assignedAt?: string;
  doctorId?: number;
  doctorName?: string;
}

// Simple API request function
async function fetchAPI<T>(method: string, url: string, data?: any): Promise<T> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include session cookies
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  
  return response.json();
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Fetch doctors with patient counts
  const { data: doctorsResponse, isLoading } = useQuery({
    queryKey: ['/api/admin/doctors'],
    queryFn: () => fetchAPI<{ success: boolean; doctors: Doctor[] }>('GET', '/api/admin/doctors'),
  });

  // Fetch all patients
  const { data: patientsResponse } = useQuery({
    queryKey: ['/api/admin/patients'],
    queryFn: () => fetchAPI<{ success: boolean; patients: Patient[] }>('GET', '/api/admin/patients'),
  });

  const doctors = doctorsResponse?.doctors || [];
  const patients = patientsResponse?.patients || [];

  // Delete doctor mutation
  const deleteDoctorMutation = useMutation({
    mutationFn: ({ doctorId, reassignToDoctorId }: { doctorId: number; reassignToDoctorId?: number }) =>
      fetchAPI('DELETE', `/api/admin/doctor/${doctorId}`, { reassignToDoctorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/doctors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/patients'] });
      toast({ title: "Doctor deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting doctor", description: error.message, variant: "destructive" });
    }
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: (patientId: number) => fetchAPI('DELETE', `/api/admin/patient/${patientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/patients'] });
      toast({ title: "Patient deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting patient", description: error.message, variant: "destructive" });
    }
  });

  // Reassign patient mutation
  const reassignPatientMutation = useMutation({
    mutationFn: ({ patientId, newDoctorId }: { patientId: number; newDoctorId: number }) =>
      fetchAPI('PUT', `/api/admin/patient/${patientId}/reassign`, { newDoctorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/patients'] });
      toast({ title: "Patient reassigned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error reassigning patient", description: error.message, variant: "destructive" });
    }
  });

  // Create a mutation for adding a new doctor
  const createDoctorMutation = useMutation({
    mutationFn: (newDoctor: { name: string; email: string; phone: string }) => 
      fetchAPI<{ success: boolean; message: string; doctor: Doctor }>('POST', '/api/admin/doctors', newDoctor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/doctors'] });
      toast({ title: "Success", description: "Doctor has been created and invited." });
      setNewName('');
      setNewEmail('');
      setNewPhone('');
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create doctor.", variant: "destructive" });
    },
  });

  const handleCreateDoctor = () => {
    if (newName && newEmail && newPhone) {
      createDoctorMutation.mutate({ name: newName, email: newEmail, phone: newPhone });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationRibbon showLogout={true} userType="admin" />
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Create Doctor Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create & Invite New Doctor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <input 
            placeholder="Doctor's Full Name" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            placeholder="Doctor's Email" 
            type="email" 
            value={newEmail} 
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            placeholder="Doctor's Mobile Number" 
            type="tel" 
            value={newPhone} 
            onChange={(e) => setNewPhone(e.target.value)}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={handleCreateDoctor} disabled={createDoctorMutation.isPending}>
            {createDoctorMutation.isPending ? 'Creating...' : 'Create & Invite Doctor'}
          </Button>
        </CardContent>
      </Card>

      {/* Doctor List Section */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Phone Number</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td className="p-4 align-middle text-center text-gray-500" colSpan={5}>Loading doctors...</td>
                  </tr>
                )}
                {!isLoading && doctors.length === 0 && (
                  <tr>
                    <td className="p-4 align-middle text-center text-gray-500" colSpan={5}>No doctors found</td>
                  </tr>
                )}
                {doctors.map((doctor: Doctor) => (
                  <tr key={doctor.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 align-middle">{doctor.name}</td>
                    <td className="p-4 align-middle">{doctor.email}</td>
                    <td className="p-4 align-middle">{doctor.phone}</td>
                    <td className="p-4 align-middle">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        doctor.isSetupComplete 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doctor.isSetupComplete ? 'Active' : 'Pending Setup'}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete Dr. ${doctor.name}? This will remove all patient assignments.`)) {
                            deleteDoctorMutation.mutate({ doctorId: doctor.id });
                          }
                        }}
                        disabled={deleteDoctorMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Management Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Patient Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Phone</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Assigned Doctor</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 && (
                  <tr>
                    <td className="p-4 align-middle text-center text-gray-500" colSpan={5}>No patients found</td>
                  </tr>
                )}
                {patients.map((patient: Patient) => (
                  <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 align-middle">{patient.name}</td>
                    <td className="p-4 align-middle">{patient.email}</td>
                    <td className="p-4 align-middle">{patient.phoneNumber}</td>
                    <td className="p-4 align-middle">
                      {patient.doctorName ? (
                        <span className="text-green-700">Dr. {patient.doctorName}</span>
                      ) : (
                        <span className="text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex gap-2">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (value && confirm(`Reassign ${patient.name} to this doctor?`)) {
                              reassignPatientMutation.mutate({ 
                                patientId: patient.id, 
                                newDoctorId: parseInt(value) 
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Reassign" />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map((doctor) => (
                              <SelectItem key={doctor.id} value={doctor.id.toString()}>
                                Dr. {doctor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete patient ${patient.name}? This action cannot be undone.`)) {
                              deletePatientMutation.mutate(patient.id);
                            }
                          }}
                          disabled={deletePatientMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;