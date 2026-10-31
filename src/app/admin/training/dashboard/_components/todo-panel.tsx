import Link from "next/link";
import { CheckCircle2, ClipboardCheck, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DashboardTodo,
  DashboardTodoKind,
} from "../../lib/dashboard-agenda";

const MAX_VISIBLE = 5;

const KIND: Record<
  DashboardTodoKind,
  { icon: typeof ClipboardCheck; cta: string; tone: string }
> = {
  close: {
    icon: ClipboardCheck,
    cta: "Clôturer",
    tone: "bg-warning text-warning-foreground",
  },
  fill: {
    icon: UserPlus,
    cta: "Inscrire",
    tone: "bg-muted text-foreground",
  },
};

/** Les sessions qui attendent une action de l'organisme. */
export function TodoPanel({
  todos,
  className,
}: {
  todos: DashboardTodo[];
  className?: string;
}) {
  const visible = todos.slice(0, MAX_VISIBLE);
  const hidden = todos.length - visible.length;

  return (
    <section
      aria-labelledby="todo-title"
      className={cn("bg-card rounded-2xl border p-5 sm:p-6", className)}
    >
      <h2
        id="todo-title"
        className="flex items-baseline gap-2 text-xl font-semibold tracking-tight"
      >
        À faire
        {todos.length > 0 && (
          <span className="text-muted-foreground text-base font-medium tabular-nums">
            {todos.length}
          </span>
        )}
      </h2>

      {todos.length === 0 ? (
        <p className="text-muted-foreground mt-4 flex gap-2 text-sm">
          <CheckCircle2
            className="text-success mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            Rien en attente. Les sessions à clôturer et celles qui manquent
            d&apos;inscrits apparaîtront ici.
          </span>
        </p>
      ) : (
        <ul className="-mx-2 mt-3 space-y-1">
          {visible.map((todo) => {
            const { icon: Icon, cta, tone } = KIND[todo.kind];
            return (
              <li key={todo.id}>
                <Link
                  href={todo.href}
                  className="hover:bg-muted focus-visible:ring-ring group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      tone
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {todo.title}
                    </span>
                    <span className="text-muted-foreground block text-sm">
                      {todo.detail}
                    </span>
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground shrink-0 pt-0.5 text-sm font-medium">
                    {cta}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hidden > 0 && (
        <Link
          href="/admin/training/sessions"
          className="text-muted-foreground hover:text-foreground mt-2 inline-block text-sm underline-offset-4 hover:underline"
        >
          {hidden} autre{hidden > 1 ? "s" : ""} dans la liste des sessions
        </Link>
      )}
    </section>
  );
}
