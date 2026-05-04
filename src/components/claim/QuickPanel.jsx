import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Zap } from "lucide-react";

export default function QuickPanel({ onApply, onClose, payerType: _payerType }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.QuickTemplate.filter({ active: true }, "-updated_date", 100);
      setTemplates(data);
      setLoading(false);
    };
    load();
  }, []);

  const grouped = templates.reduce((acc, t) => {
    const cat = t.category || "Custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="bg-card border-2 border-primary/20 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Quick Panel</h3>
          <span className="text-xs text-muted-foreground">Click a template to add its procedures</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-3 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No templates yet. Create them in Quick Templates.
        </p>
      ) : (
        Object.entries(grouped).map(([category, tmpls]) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{category}</h4>
            <div className="flex flex-wrap gap-2">
              {tmpls.map(t => (
                <button
                  key={t.id}
                  onClick={() => onApply(t)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {t.title}
                  <Badge variant="outline" className="text-[10px]">{t.procedures?.length || 0}</Badge>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}