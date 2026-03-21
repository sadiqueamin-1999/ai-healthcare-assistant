import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LayoutDashboard, ShieldAlert, FileText, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type PatientMessage = Tables<"patient_messages">;
type ClinicalNote = Tables<"clinical_notes">;
type PatientLetter = Tables<"patient_letters">;

const riskColor: Record<string, string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-warning/10 text-warning",
  Low: "bg-success/10 text-success",
};

const Dashboard = () => {
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [letters, setLetters] = useState<PatientLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMessage, setSelectedMessage] = useState<PatientMessage | null>(null);
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<PatientLetter | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [msgRes, noteRes, letterRes] = await Promise.all([
          supabase.from("patient_messages").select("*").order("submitted_at", { ascending: false }).limit(10),
          supabase.from("clinical_notes").select("*").order("submitted_at", { ascending: false }).limit(10),
          supabase.from("patient_letters").select("*").order("submitted_at", { ascending: false }).limit(10),
        ]);
        if (msgRes.error) throw msgRes.error;
        if (noteRes.error) throw noteRes.error;
        if (letterRes.error) throw letterRes.error;
        setMessages(msgRes.data);
        setNotes(noteRes.data);
        setLetters(letterRes.data);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const ts = (d: string) => format(new Date(d), "dd MMM yyyy, HH:mm");
  const preview = (text: string, len = 100) => text.length > len ? text.slice(0, len) + "…" : text;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Recent AI-processed records</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        {/* Patient Messages */}
        <Section
          icon={<ShieldAlert className="h-4 w-4" />}
          title="Patient Messages"
          count={messages.length}
        >
          {messages.length === 0 ? (
            <EmptyState>No patient messages yet.</EmptyState>
          ) : (
            <div className="grid gap-3">
              {messages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMessage(m)}
                  className={`w-full text-left rounded-lg border p-4 hover:shadow-sm transition-all ${
                    m.safety_flag
                      ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {m.safety_flag && (
                        <span className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-destructive">
                          <ShieldAlert className="h-3 w-3 text-destructive-foreground" />
                        </span>
                      )}
                      <p className="text-sm text-foreground">{preview(m.message_text)}</p>
                    </div>
                    {m.ai_risk_level && (
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskColor[m.ai_risk_level] ?? "bg-muted text-muted-foreground"}`}>
                        {m.ai_risk_level}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{ts(m.submitted_at)}</p>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Clinical Notes */}
        <Section
          icon={<FileText className="h-4 w-4" />}
          title="Clinical Notes"
          count={notes.length}
        >
          {notes.length === 0 ? (
            <EmptyState>No clinical notes yet.</EmptyState>
          ) : (
            <div className="grid gap-3">
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNote(n)}
                  className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <p className="text-sm text-foreground">{preview(n.note_text)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{ts(n.submitted_at)}</p>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Patient Letters */}
        <Section
          icon={<Mail className="h-4 w-4" />}
          title="Patient Letters"
          count={letters.length}
        >
          {letters.length === 0 ? (
            <EmptyState>No patient letters yet.</EmptyState>
          ) : (
            <div className="grid gap-3">
              {letters.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLetter(l)}
                  className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <p className="text-sm text-foreground">{preview(l.letter_text)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{ts(l.submitted_at)}</p>
                </button>
              ))}
            </div>
          )}
        </Section>
      </main>

      {/* Message Modal */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedMessage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  Patient Message
                </DialogTitle>
                <DialogDescription>{ts(selectedMessage.submitted_at)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <ModalField label="Original Message" value={selectedMessage.message_text} />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Risk Level:</span>
                  {selectedMessage.ai_risk_level && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskColor[selectedMessage.ai_risk_level] ?? "bg-muted text-muted-foreground"}`}>
                      {selectedMessage.ai_risk_level}
                    </span>
                  )}
                </div>
                <ModalField label="AI Summary" value={selectedMessage.ai_summary} />
                <ModalField label="Draft Reply" value={selectedMessage.ai_draft_reply} />
                <ModalField label="Reasoning" value={selectedMessage.ai_reasoning} muted />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Note Modal */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedNote && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Clinical Note
                </DialogTitle>
                <DialogDescription>{ts(selectedNote.submitted_at)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <ModalField label="Original Note" value={selectedNote.note_text} />
                <ModalField label="Summary" value={selectedNote.ai_summary} />
                <ModalField label="Key Points" value={selectedNote.ai_key_points} />
                <ModalField label="Timeline" value={selectedNote.ai_timeline} />
                <ModalField label="Reasoning" value={selectedNote.ai_reasoning} muted />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Letter Modal */}
      <Dialog open={!!selectedLetter} onOpenChange={() => setSelectedLetter(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLetter && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Patient Letter
                </DialogTitle>
                <DialogDescription>{ts(selectedLetter.submitted_at)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <ModalField label="Original Letter" value={selectedLetter.letter_text} />
                <ModalField label="Plain English Version" value={selectedLetter.ai_plain_english} />
                <ModalField label="Next Steps" value={selectedLetter.ai_next_steps} />
                <ModalField label="Important Warnings" value={selectedLetter.ai_important_warnings} />
                <ModalField label="Reasoning" value={selectedLetter.ai_reasoning} muted />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary">{icon}</span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
      </div>
      {children}
    </section>
  );
}

function ModalField({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string | null;
  muted?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      <p className={`text-sm leading-relaxed whitespace-pre-line rounded-md border border-border p-3 ${muted ? "bg-muted/30 text-muted-foreground" : "bg-card text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default Dashboard;
