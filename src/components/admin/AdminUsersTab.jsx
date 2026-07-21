import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Trash2, Eye, UserX, UserCheck, KeyRound, Search } from "lucide-react";

export default function AdminUsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.User.list("-created_date", 500);
      setUsers(data || []);
    } catch (e) {
      console.error("Failed to load users:", e);
    }
    setLoading(false);
  };

  const filtered = users.filter(u =>
    !search || 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const sendEmail = async () => {
    if (!emailModal || !emailSubject || !emailBody) return;
    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: emailModal.email,
        subject: emailSubject,
        body: emailBody
      });
      alert("Email sent successfully.");
      setEmailModal(null); setEmailSubject(""); setEmailBody("");
    } catch (e) {
      alert("Failed to send email: " + e.message);
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" onClick={loadUsers}>Refresh</Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading users...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Membership</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.role || "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.membership_status && u.membership_status !== "none" ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">{u.membership_plan || u.membership_status}</span>
                      ) : <span className="text-xs text-muted-foreground">None</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" title="View Details" onClick={() => setSelectedUser(u)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" title="Email User" onClick={() => setEmailModal(u)}>
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" title="Delete User" onClick={() => setConfirmDelete(u)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-3">
            <h3 className="font-bold text-lg">{selectedUser.full_name || selectedUser.email}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{selectedUser.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Role:</span><span>{selectedUser.role}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Membership:</span><span>{selectedUser.membership_plan || "None"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Membership Status:</span><span>{selectedUser.membership_status || "none"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Joined:</span><span>{selectedUser.created_date ? new Date(selectedUser.created_date).toLocaleString() : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Stripe Sub ID:</span><span className="text-xs truncate max-w-[180px]">{selectedUser.membership_stripe_subscription_id || "—"}</span></div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setSelectedUser(null)}>Close</Button>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold">Email {emailModal.full_name || emailModal.email}</h3>
            <Input placeholder="Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            <textarea
              className="w-full border border-input rounded-md px-3 py-2 text-sm min-h-[120px] bg-transparent"
              placeholder="Message body..."
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={sendEmail} disabled={sending} className="flex-1">{sending ? "Sending..." : "Send Email"}</Button>
              <Button variant="outline" onClick={() => { setEmailModal(null); setEmailSubject(""); setEmailBody(""); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-destructive">Delete User?</h3>
            <p className="text-sm text-muted-foreground">
              This will remove <strong>{confirmDelete.full_name || confirmDelete.email}</strong> from the system. This action cannot be undone. Contact Base44 support to fully remove from auth if needed.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={() => {
                alert("To fully delete a user from authentication, please contact Base44 support. Patient/claim data can be deleted from their respective pages.");
                setConfirmDelete(null);
              }}>Understood</Button>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}