import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ScheduleNextVisitModal({ patient, claim, onClose, onSuccess }) {
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [appointmentType, setAppointmentType] = useState("Follow-up");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);
  const { toast } = useToast();

  const handleSchedule = async () => {
    if (!appointmentDate || !appointmentTime) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Create appointment
      const appointmentDateTime = `${appointmentDate}T${appointmentTime}`;
      const appointment = await base44.entities.Appointment.create({
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        appointment_date: appointmentDateTime,
        appointment_type: appointmentType,
        duration_minutes: parseInt(durationMinutes),
        notes: notes,
        claim_id: claim?.id,
        synced_to_calendar: false
      });

      // Sync to Google Calendar
      const syncRes = await base44.functions.invoke("syncAppointmentToCalendar", {
        appointment_id: appointment.id
      });

      if (syncRes.data.success) {
        setSynced(true);
        toast({ title: "Appointment scheduled and synced to Google Calendar!" });
        if (onSuccess) onSuccess(appointment);
        setTimeout(() => onClose(), 2000);
      }
    } catch (e) {
      console.error(e);
      toast({ title: e.message || "Failed to schedule appointment", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Schedule Next Visit</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {synced ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold text-lg">Appointment Scheduled!</p>
            <p className="text-sm text-muted-foreground">
              {appointmentDate} at {appointmentTime} has been added to your Google Calendar.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              📅 This will sync directly to <strong>drahuwe@gmail.com</strong>'s Google Calendar.
            </div>

            <div>
              <Label className="text-sm">Patient</Label>
              <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-medium">
                {patient?.first_name} {patient?.last_name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Date</Label>
                <Input
                  type="date"
                  value={appointmentDate}
                  onChange={e => setAppointmentDate(e.target.value)}
                  className="mt-1"
                  disabled={loading}
                />
              </div>
              <div>
                <Label className="text-sm">Time</Label>
                <Input
                  type="time"
                  value={appointmentTime}
                  onChange={e => setAppointmentTime(e.target.value)}
                  className="mt-1"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Visit Type</Label>
                <Select value={appointmentType} onValueChange={setAppointmentType} disabled={loading}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="New Patient">New Patient</SelectItem>
                    <SelectItem value="Re-evaluation">Re-evaluation</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Duration (min)</Label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value)}
                  className="mt-1"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about the visit..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1 h-20 text-sm"
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSchedule} disabled={loading} className="flex-1 h-10">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    📅 Schedule & Sync
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}