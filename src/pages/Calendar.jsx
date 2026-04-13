import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Edit2, Trash2, X } from "lucide-react";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 13)); // April 13, 2026
  const [googleEvents, setGoogleEvents] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [selectedDayView, setSelectedDayView] = useState(null);
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

  const handleSaveAppointment = async () => {
    if (!formData.patient_id || !formData.appointment_date) {
      toast({ title: "Select a patient and date", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await base44.entities.Appointment.update(editingId, {
          patient_id: formData.patient_id,
          patient_name: formData.patient_name,
          appointment_date: formData.appointment_date,
          appointment_type: formData.appointment_type,
          duration_minutes: formData.duration_minutes,
          notes: formData.notes,
        });
        toast({ title: "Appointment updated" });
      } else {
        await base44.entities.Appointment.create({
          ...formData,
          synced_to_calendar: false,
        });
        toast({ title: "Appointment added" });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        patient_id: "",
        patient_name: "",
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_type: "Follow-up",
        duration_minutes: 30,
        notes: "",
      });
      setPatientSearch("");
      // Refresh appointments
      const appts = await base44.entities.Appointment.filter(
        { cancelled: false },
        "-appointment_date",
        100
      );
      setAppointments(appts);
    } catch (error) {
      toast({ title: error.message || "Failed to save appointment", variant: "destructive" });
    }
  };

  const handleEditAppointment = (appt) => {
    setEditingId(appt.id);
    setFormData({
      patient_id: appt.patient_id,
      patient_name: appt.patient_name,
      appointment_date: appt.appointment_date,
      appointment_type: appt.appointment_type,
      duration_minutes: appt.duration_minutes,
      notes: appt.notes || "",
    });
    setShowForm(true);
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await base44.entities.Appointment.update(id, { cancelled: true });
      toast({ title: "Appointment deleted" });
      const appts = await base44.entities.Appointment.filter(
        { cancelled: false },
        "-appointment_date",
        100
      );
      setAppointments(appts);
    } catch (error) {
      toast({ title: "Failed to delete appointment", variant: "destructive" });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      patient_id: "",
      patient_name: "",
      appointment_date: new Date().toISOString().split("T")[0],
      appointment_type: "Follow-up",
      duration_minutes: 30,
      notes: "",
    });
    setPatientSearch("");
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
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-2 overflow-hidden cursor-pointer transition-colors ${
                  hasEvents ? "bg-blue-50 border-blue-300 hover:bg-blue-100" : "bg-card border-border hover:bg-muted"
                }`}
                onClick={() => setSelectedDayView(dateStr)}
              >
                <div className="text-sm font-semibold mb-1">{day}</div>
                <div className="text-xs space-y-1 max-h-16 overflow-y-auto">
                  {appts.map((a, i) => (
                    <div
                      key={`appt-${i}`}
                      className="bg-green-200 text-green-900 px-1.5 py-0.5 rounded text-xs truncate group hover:bg-green-300"
                      title={`${a.patient_name} - ${a.appointment_type}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAppointment(a);
                      }}
                    >
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

      {/* Full Day Schedule View */}
      {selectedDayView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-card">
              <h2 className="text-xl font-bold">
                {new Date(selectedDayView + "T00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h2>
              <button onClick={() => setSelectedDayView(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {getEventsForDay(parseInt(selectedDayView.split("-")[2])).appts.length === 0 && 
               getEventsForDay(parseInt(selectedDayView.split("-")[2])).google.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No appointments scheduled</p>
              ) : (
                <>
                  {getEventsForDay(parseInt(selectedDayView.split("-")[2])).appts.map((a, i) => (
                    <div key={`day-appt-${i}`} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{a.patient_name}</h3>
                          <div className="text-sm text-muted-foreground space-y-1 mt-2">
                            <div><span className="font-medium">Type:</span> {a.appointment_type}</div>
                            <div><span className="font-medium">Duration:</span> {a.duration_minutes} min</div>
                          </div>
                        </div>
                      </div>
                      {a.notes && (
                        <div className="mb-3 p-2 bg-white rounded border border-green-100">
                          <p className="text-xs font-medium text-muted-foreground">Notes:</p>
                          <p className="text-sm">{a.notes}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => { handleEditAppointment(a); setSelectedDayView(null); }} variant="outline" className="gap-1 flex-1">
                          <Edit2 className="w-3 h-3" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => { handleEditAppointment(a); setSelectedDayView(null); }} className="gap-1 flex-1 bg-blue-600 hover:bg-blue-700">
                          📅 Reschedule
                        </Button>
                        <Button size="sm" onClick={() => { handleDeleteAppointment(a.id); setSelectedDayView(null); }} variant="destructive" className="gap-1">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {getEventsForDay(parseInt(selectedDayView.split("-")[2])).google.map((e, i) => (
                    <div key={`day-google-${i}`} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{e.title}</h3>
                      </div>
                      {e.description && (
                        <p className="text-sm text-muted-foreground mb-3">{e.description}</p>
                      )}
                      <div className="flex gap-2">
                        <a href={e.htmlLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button size="sm" variant="outline" className="gap-1 w-full">
                            <Edit2 className="w-3 h-3" /> Edit in Google
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            
            <Button onClick={() => { setFormData(prev => ({ ...prev, appointment_date: selectedDayView })); setShowForm(true); setSelectedDayView(null); }} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Add Appointment to This Day
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Appointment Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? "Edit Appointment" : "Add Patient Appointment"}</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <Label className="text-sm">Patient</Label>
              <div className="relative mt-1">
                <Input
                  placeholder="Type 3+ letters of first or last name..."
                  className="mt-1"
                  value={patientSearch || formData.patient_name}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    if (e.target.value !== formData.patient_name) {
                      setFormData(prev => ({ ...prev, patient_id: "", patient_name: "" }));
                    }
                  }}
                  onFocus={() => {}}
                />
                {(patientSearch.length >= 3 || (formData.patient_id && patientSearch)) && filteredPatients.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            patient_id: p.id,
                            patient_name: `${p.first_name} ${p.last_name}`
                          }));
                          setPatientSearch("");
                        }}
                      >
                        <span className="font-medium">{p.first_name} {p.last_name}</span>
                        <span className="text-xs text-muted-foreground">{p.phone || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
                {patientSearch.length >= 3 && filteredPatients.length === 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 text-sm text-muted-foreground text-center">
                    No patients found
                  </div>
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
                <Label className="text-sm">Duration</Label>
                <select
                  className="mt-1 w-full border border-input rounded-md px-2 py-1.5 text-sm"
                  value={formData.duration_minutes}
                  onChange={e => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={75}>75 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-sm">Notes</Label>
              <textarea className="mt-1 w-full border border-input rounded-md px-2 py-1.5 text-sm" rows={2} value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveAppointment} className="flex-1">{editingId ? "Update" : "Add"} Appointment</Button>
              <Button variant="outline" onClick={closeForm} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}