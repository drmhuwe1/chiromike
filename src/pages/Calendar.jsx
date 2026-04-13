import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 13)); // April 13, 2026
  const [googleEvents, setGoogleEvents] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    patient_name: "",
    appointment_date: new Date().toISOString().split("T")[0],
    appointment_type: "Follow-up",
    duration_minutes: 30,
    notes: "",
  });
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const { toast } = useToast();

  // Load calendar events and appointments
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Fetch Google Calendar events
        const calRes = await base44.functions.invoke("fetchGoogleCalendarEvents", {
          startDate: firstDay.toISOString(),
          endDate: lastDay.toISOString(),
        });
        setGoogleEvents(calRes.data.events || []);

        // Fetch patient appointments
        const appts = await base44.entities.Appointment.filter(
          { cancelled: false },
          "-appointment_date",
          100
        );
        setAppointments(appts);

        // Load patients for form
        const pts = await base44.entities.Patient.list("-updated_date", 300);
        setPatients(pts);
      } catch (error) {
        toast({ title: "Failed to load calendar", variant: "destructive" });
        console.error(error);
      }
      setLoading(false);
    };
    load();
  }, [currentDate]);

  const handleAddAppointment = async () => {
    if (!formData.patient_id || !formData.appointment_date) {
      toast({ title: "Select a patient and date", variant: "destructive" });
      return;
    }
    try {
      await base44.entities.Appointment.create({
        ...formData,
        synced_to_calendar: false,
      });
      toast({ title: "Appointment added" });
      setShowForm(false);
      setFormData({
        patient_id: "",
        patient_name: "",
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_type: "Follow-up",
        duration_minutes: 30,
        notes: "",
      });
      // Refresh appointments
      const appts = await base44.entities.Appointment.filter(
        { cancelled: false },
        "-appointment_date",
        100
      );
      setAppointments(appts);
    } catch (error) {
      toast({ title: error.message || "Failed to add appointment", variant: "destructive" });
    }
  };

  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth(currentDate) }, (_, i) => null);

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const google = googleEvents.filter(e => {
      const eventDate = new Date(e.start).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
    const appts = appointments.filter(a => a.appointment_date === dateStr);
    return { google, appts };
  };

  const filteredPatients = patientSearch.length >= 3
    ? patients.filter(p => {
        const q = patientSearch.toLowerCase();
        return p.first_name?.toLowerCase().startsWith(q) || p.last_name?.toLowerCase().startsWith(q);
      }).slice(0, 8)
    : [];

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6" /> Calendar & Scheduling
        </h1>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Appointment
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-muted rounded">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-muted rounded">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">{day}</div>
          ))}
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="aspect-square" />
          ))}
          {days.map(day => {
            const { google, appts } = getEventsForDay(day);
            const hasEvents = google.length > 0 || appts.length > 0;
            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-2 overflow-hidden ${
                  hasEvents ? "bg-blue-50 border-blue-300" : "bg-card border-border hover:bg-muted"
                }`}
              >
                <div className="text-sm font-semibold mb-1">{day}</div>
                <div className="text-xs space-y-0.5 max-h-16 overflow-y-auto">
                  {appts.map((a, i) => (
                    <div key={`appt-${i}`} className="bg-green-200 text-green-900 px-1.5 py-0.5 rounded text-xs truncate" title={a.patient_name}>
                      {a.patient_name}
                    </div>
                  ))}
                  {google.map((e, i) => (
                    <div key={`google-${i}`} className="bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded text-xs truncate" title={e.title}>
                      {e.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Appointment Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold">Add Patient Appointment</h2>

            <div>
              <Label className="text-sm">Patient</Label>
              <div className="relative mt-1">
                <Input
                  placeholder="Type 3+ letters..."
                  className="mt-1"
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  onFocus={() => patientSearch.length >= 3 && filteredPatients.length > 0}
                />
                {patientSearch.length >= 3 && filteredPatients.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            patient_id: p.id,
                            patient_name: `${p.first_name} ${p.last_name}`
                          }));
                          setPatientSearch("");
                        }}
                      >
                        {p.first_name} {p.last_name}
                      </button>
                    ))}
                  </div>
                )}
                {formData.patient_id && (
                  <div className="mt-1 text-sm font-medium">{formData.patient_name}</div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm">Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={formData.appointment_date}
                onChange={e => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Type</Label>
                <select
                  className="mt-1 w-full border border-input rounded-md px-2 py-1.5 text-sm"
                  value={formData.appointment_type}
                  onChange={e => setFormData(prev => ({ ...prev, appointment_type: e.target.value }))}
                >
                  <option>Follow-up</option>
                  <option>New Patient</option>
                  <option>Re-evaluation</option>
                  <option>Maintenance</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">Duration (min)</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={formData.duration_minutes}
                  onChange={e => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Notes</Label>
              <textarea className="mt-1 w-full border border-input rounded-md px-2 py-1.5 text-sm" rows={2} value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddAppointment} className="flex-1">Add Appointment</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}