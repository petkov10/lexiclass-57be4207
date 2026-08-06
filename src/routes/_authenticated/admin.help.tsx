import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LifeBuoy, GraduationCap, BookOpen, ListTree, FileStack, Sparkles, DatabaseBackup } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/help")({
  component: HelpPage,
});

const STEPS = [
  { icon: GraduationCap, title: "1. Създайте класове", desc: "Меню „Класове“ — добавете класовете, с които работите (напр. 8А, 9Б).", to: "/admin/classes" as const },
  { icon: BookOpen, title: "2. Добавете предмети", desc: "Меню „Предмети“ — задайте име, цвят и икона, после ги свържете с класовете.", to: "/admin/subjects" as const },
  { icon: ListTree, title: "3. Въведете теми", desc: "Меню „Теми“ — темите са уроците по даден предмет за даден клас.", to: "/admin/themes" as const },
  { icon: FileStack, title: "4. Качете ресурси", desc: "Меню „Ресурси“ — презентации, документи, видео и връзки към всяка тема.", to: "/admin/resources" as const },
  { icon: Sparkles, title: "5. Използвайте AI асистентите", desc: "Меню „AI Асистенти“ — разработки на уроци, тестове, документи и материали.", to: "/admin/ai" as const },
  { icon: DatabaseBackup, title: "6. Правете архив редовно", desc: "Меню „Миграция и архив“ — сваляйте пълен архив поне веднъж седмично.", to: "/admin/backup" as const },
];

const FAQ = [
  {
    q: "Учениците влизат ли в приложението?",
    a: "Не. Приложението е само за учители. Публичната част служи за показване на материалите в клас (например на проектор), а достъпът до нея може да бъде свободен, с ПИН код или с потребител и парола — настройва се в „Настройки“.",
  },
  {
    q: "Как добавям нов потребител (колега)?",
    a: "Колегата се регистрира сам от екрана за вход. След това от „Потребители“ го одобрявате и му давате роля: „редактор“ (може да добавя и редактира съдържание) или „администратор“ (пълен достъп, включително настройки).",
  },
  {
    q: "Каква е разликата между редактор и администратор?",
    a: "Редакторът управлява класове, предмети, теми и ресурси, и ползва AI асистентите. Администраторът има достъп и до настройките, потребителите, дневника и архива.",
  },
  {
    q: "Мога ли да редактирам материал, генериран от AI?",
    a: "Да. Всеки генериран материал се отваря в редактор, където можете да променяте текста и таблиците, преди да го запазите като ресурс, да го отпечатате или да го свалите като Word документ.",
  },
  {
    q: "Може ли да се доверя на всичко, което AI генерира?",
    a: "Асистентът е инструктиран да не измисля нормативни текстове, номера на членове, дати и лични данни, и да заявява изрично, когато не разполага със сигурна информация. Въпреки това винаги преглеждайте документа преди употреба — отговорността за съдържанието е ваша.",
  },
  {
    q: "Какво става, ако изтрия клас?",
    a: "Изтриването на клас от „Настройки“ премахва каскадно всички свързани предмети, теми и ресурси в него. Действието е необратимо — направете архив предварително.",
  },
  {
    q: "Как да сваля цялото съдържание на флашка?",
    a: "От „Миграция и архив“ изберете „Свали цялото съдържание (папки)“. Ще получите .zip файл с папки, подредени като в сайта: клас → предмет → тема → ресурси.",
  },
  {
    q: "Защо не виждам даден ресурс в публичната част?",
    a: "Вероятно е маркиран като скрит (чернова). Отворете го в „Ресурси“ и превключете видимостта.",
  },
  {
    q: "Мога ли да качвам големи файлове?",
    a: "Да. Качването се извършва на части с проверка след завършване. При много големи файлове (видео) е по-добре да ги качите в облак и да добавите ресурс от тип „връзка“, за да пестите място.",
  },
];

function HelpPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <LifeBuoy className="text-primary" /> Помощ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Кратко ръководство и отговори на често задавани въпроси.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Откъде да започна</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s) => (
            <Link key={s.title} to={s.to} className="hover-lift">
              <Card className="p-4 flex items-start gap-3 h-full">
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{s.title}</div>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Често задавани въпроси</h2>
        <Card className="px-4">
          <Accordion type="single" collapsible>
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </section>
    </div>
  );
}
