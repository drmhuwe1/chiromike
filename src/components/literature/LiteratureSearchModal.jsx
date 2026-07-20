import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Loader2, Search, Check, Star, Award, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function LiteratureSearchModal({ context, onSelect, onClose }) {
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const search = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("searchMedicalLiterature", context);
      const found = res.data?.articles || [];
      setArticles(found);
      // Auto-select top 3 by relevance (default = "auto-select best" behavior)
      const sorted = [...found].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      setSelected(new Set(sorted.slice(0, 3).map((a) => a.title)));
      setHasSearched(true);
    } catch (e) {
      toast({ title: e.message || "Failed to search literature", variant: "destructive" });
    }
    setLoading(false);
  };

  const sortedArticles = [...articles].sort(
    (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
  );

  const toggle = (title) => {
    const next = new Set(selected);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    setSelected(next);
  };

  const autoSelect = () => {
    const sorted = [...articles].sort(
      (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
    );
    setSelected(new Set(sorted.slice(0, 3).map((a) => a.title)));
    toast({ title: "Top 3 most relevant articles selected" });
  };

  const confirm = () => {
    const chosen = articles.filter((a) => selected.has(a.title));
    onSelect(chosen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center sticky top-0 bg-card px-6 py-4 border-b border-border z-10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Medical Literature Lookup</h2>
              <p className="text-xs text-muted-foreground">
                Peer-reviewed research supporting treatment necessity
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {!hasSearched && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                We'll search peer-reviewed medical journals for articles supporting
                chiropractic treatment necessity for this{" "}
                {(context.accident_type || "personal injury").toLowerCase()} case.
              </p>
              <div className="bg-muted rounded-lg p-4 text-left text-xs mb-4 max-w-xl mx-auto space-y-1">
                <div>
                  <strong>Chief complaint:</strong> {context.chief_complaint || "N/A"}
                </div>
                <div>
                  <strong>Diagnoses:</strong>{" "}
                  {context.diagnoses?.map((d) => d.code).join(", ") || "N/A"}
                </div>
                <div>
                  <strong>Pain areas:</strong> {context.pain_areas?.join(", ") || "N/A"}
                </div>
                <div>
                  <strong>Accident type:</strong> {context.accident_type || "N/A"}
                </div>
              </div>
              <Button onClick={search}>
                <Search className="w-4 h-4 mr-2" /> Search Medical Literature
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Searching peer-reviewed medical journals...
              </p>
              <p className="text-xs text-muted-foreground">This may take 20-30 seconds</p>
            </div>
          )}

          {hasSearched && !loading && (
            <>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
                <p className="text-sm text-muted-foreground">
                  {articles.length} articles found · {selected.size} selected
                </p>
                <Button size="sm" variant="outline" onClick={autoSelect}>
                  <Award className="w-3.5 h-3.5 mr-1.5" /> Auto-select top 3
                </Button>
              </div>

              <div className="space-y-2">
                {sortedArticles.map((article, i) => {
                  const isSelected = selected.has(article.title);
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30"
                      }`}
                      onClick={() => toggle(article.title)}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className="font-semibold text-sm flex-1">{article.title}</p>
                            {article.relevance_score >= 8 && (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {article.ama_citation}
                          </p>
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View source ↗
                            </a>
                          )}
                          {article.relevance_summary && (
                            <p className="text-xs mt-2 text-foreground/80">
                              {article.relevance_summary}
                            </p>
                          )}
                          <div className="flex items-center flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              Relevance: {article.relevance_score}/10
                            </span>
                            {article.journal && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                {article.journal}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {articles.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No articles found. Try regenerating or adjusting the case context.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={confirm}
                  disabled={selected.size === 0}
                  className="flex-1"
                >
                  Insert {selected.size} Citation{selected.size === 1 ? "" : "s"}
                </Button>
                <Button onClick={search} variant="outline" className="flex-1">
                  <Search className="w-3.5 h-3.5 mr-1.5" /> Search Again
                </Button>
                <Button onClick={onClose} variant="ghost" className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}