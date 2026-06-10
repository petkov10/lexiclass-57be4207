import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { classesQuery, subjectsQuery, allThemesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { GraduationCap, BookOpen, ListTree, FileStack, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: classes } = useQuery(classesQuery);
  const { data: subjects } = useQuery(subjectsQuery);
  const { data: themes } = useQuery(allThemesQuery);
  const [resCount, setResCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from("resources").select("*", { count: "exact", head: true }).then(({ count }) => setResCount(count ?? 0));
  }, []);

  const stats = [
    { label: "Класове", value: classes?.length ?? 0, icon: GraduationCap, to: "/admin/classes" as const },
    { label: "Предмети", value: subjects?.length ?? 0, icon: BookOpen, to: "/admin/subjects" as const },
    { label: "Теми", value: themes?.length ?? 0, icon: ListTree, to: "/admin/themes" as const },
    { label: "Ресурси", value: resCount ?? 0, icon: FileStack, to: "/admin/resources" as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Табло</h1>
        <p className="text-sm text-muted-foreground mt-1">Обзор на учебното съдържание</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="hover-lift">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <s.icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">Бързи действия</h2>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>• Добавете или редактирайте класове и предмети.</li>
          <li>• Създайте тематично разпределение (ръчно или от Excel).</li>
          <li>• Качете ресурси — презентации, документи, видеа, задачи и код.</li>
          <li>• Използвайте AI асистента, за да генерирате задачи и тестове.</li>
          <li>• Направете бекъп преди големи промени.</li>
        </ul>
      </Card>
    </div>
  );
}
