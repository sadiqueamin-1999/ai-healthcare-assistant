import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BarChart3, Loader2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, startOfWeek, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type PatientMessage = Tables<"patient_messages">;
type ClinicalNote = Tables<"clinical_notes">;
type PatientLetter = Tables<"patient_letters">;

const RISK_COLORS: Record<string, string> = {
  High: "hsl(0, 72%, 51%)",
  Medium: "hsl(38, 92%, 50%)",
  Low: "hsl(152, 60%, 40%)",
};

const Analytics = () => {
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [letters, setLetters] = useState<PatientLetter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [msgRes, noteRes, letterRes] = await Promise.all([
          supabase.from("patient_messages").select("ai_risk_level, submitted_at"),
          supabase.from("clinical_notes").select("ai_key_points, submitted_at"),
          supabase.from("patient_letters").select("submitted_at"),
        ]);
        if (msgRes.error) throw msgRes.error;
        if (noteRes.error) throw noteRes.error;
        if (letterRes.error) throw letterRes.error;
        setMessages(msgRes.data as PatientMessage[]);
        setNotes(noteRes.data as ClinicalNote[]);
        setLetters(letterRes.data as PatientLetter[]);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Risk distribution pie data
  const riskData = useMemo(() => {
    const counts: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
    messages.forEach((m) => {
      const level = m.ai_risk_level;
      if (level && counts[level] !== undefined) counts[level]++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [messages]);

  // Word cloud data from key points
  const wordData = useMemo(() => {
    const freq: Record<string, number> = {};
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "of", "to", "in", "for", "is", "on", "at", "by",
      "with", "from", "as", "are", "was", "were", "be", "been", "has", "had", "have",
      "not", "no", "but", "that", "this", "it", "its", "if", "so", "do", "did", "does",
      "will", "can", "may", "shall", "should", "would", "could", "might", "about", "up",
      "out", "all", "also", "than", "then", "into", "over", "after", "before", "between",
      "under", "such", "each", "other", "any", "only", "very", "more", "most", "some",
      "new", "one", "two", "well", "per", "via", "e.g", "i.e", "etc", "mg", "bd",
      "daily", "none", "documented", "mentioned", "noted", "yes",
    ]);
    notes.forEach((n) => {
      if (!n.ai_key_points) return;
      const words = n.ai_key_points
        .replace(/[•\-–—]/g, " ")
        .replace(/[^a-zA-Z\s]/g, " ")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));
      words.forEach((w) => {
        freq[w] = (freq[w] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([text, count]) => ({ text, count }));
  }, [notes]);

  // Weekly letter frequency bar data
  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {};
    letters.forEach((l) => {
      const weekStart = startOfWeek(parseISO(l.submitted_at), { weekStartsOn: 1 });
      const key = format(weekStart, "dd MMM");
      weeks[key] = (weeks[key] || 0) + 1;
    });
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));
  }, [letters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxWordCount = wordData.length > 0 ? wordData[0].count : 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">Insights across all AI-processed records</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Risk Distribution Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Message Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {riskData.length === 0 ? (
                <EmptyChart>No triaged messages yet.</EmptyChart>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {riskData.map((entry) => (
                        <Cell key={entry.name} fill={RISK_COLORS[entry.name] ?? "#888"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Word Cloud */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Common Key Points from Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {wordData.length === 0 ? (
                <EmptyChart>No clinical notes with key points yet.</EmptyChart>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 min-h-[280px] p-4">
                  {wordData.map(({ text, count }) => {
                    const ratio = count / maxWordCount;
                    const size = 0.75 + ratio * 1.25; // 0.75rem to 2rem
                    const opacity = 0.4 + ratio * 0.6;
                    return (
                      <span
                        key={text}
                        className="text-primary font-medium leading-none select-none transition-transform hover:scale-110"
                        style={{
                          fontSize: `${size}rem`,
                          opacity,
                        }}
                        title={`${text}: ${count}`}
                      >
                        {text}
                      </span>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Letter Frequency Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Letter Explanations per Week</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <EmptyChart>No patient letters yet.</EmptyChart>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 50%)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 50%)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(214, 20%, 90%)",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  />
                  <Bar dataKey="count" name="Letters" fill="hsl(199, 89%, 38%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-[280px] rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default Analytics;
