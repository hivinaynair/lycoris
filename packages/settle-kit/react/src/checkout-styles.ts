// Prefixed, precompiled Tailwind utilities keep the embed independent of host CSS.
// Defaults use :where so explicit element classes can override typography.
export const styles = {
  card: "sk:box-border sk:grid sk:gap-5 sk:w-full sk:max-w-[400px] sk:p-6 sk:border sk:border-solid sk:border-line sk:rounded-card sk:bg-surface sk:text-ink sk:[font-family:var(--sk-font-family,inherit)] sk:shadow-card sk:max-[401px]:p-5 sk:[:where(&)_h2]:mt-1 sk:[:where(&)_h2]:mb-0 sk:[:where(&)_h2]:mx-0 sk:[:where(&)_h2]:text-[16px] sk:[:where(&)_h2]:leading-[1.5] sk:[:where(&)_h2]:font-medium sk:[:where(&)_:is(p,a,dd,dt)]:m-0 sk:[:where(&)_:is(p,a,dd,dt)]:text-[13px] sk:[:where(&)_:is(p,a,dd,dt)]:leading-[1.6] sk:[:where(&)_:is(p,dt)]:text-subtle sk:[:where(&)_a]:text-inherit sk:[:where(&)_a]:underline sk:[:where(&)_a]:underline-offset-[3px] sk:[:where(&)_:is(button,a,summary):focus-visible]:outline-2 sk:[:where(&)_:is(button,a,summary):focus-visible]:outline-brand sk:[:where(&)_:is(button,a,summary):focus-visible]:outline-offset-[3px] sk:data-[sk-theme=light]:[--sk-surface:#fff] sk:data-[sk-theme=light]:[--sk-foreground:#18181b] sk:data-[sk-theme=light]:[--sk-muted:#f4f4f5] sk:data-[sk-theme=light]:[--sk-muted-foreground:#66666f] sk:data-[sk-theme=light]:[--sk-border:#e4e4e7] sk:data-[sk-theme=light]:[--sk-primary:#18181b] sk:data-[sk-theme=light]:[--sk-primary-foreground:#fafafa] sk:data-[sk-theme=light]:[--sk-danger:#b91c1c] sk:data-[sk-theme=dark]:[--sk-surface:#18181b] sk:data-[sk-theme=dark]:[--sk-foreground:#fafafa] sk:data-[sk-theme=dark]:[--sk-muted:#27272a] sk:data-[sk-theme=dark]:[--sk-muted-foreground:#a1a1aa] sk:data-[sk-theme=dark]:[--sk-border:#3f3f46] sk:data-[sk-theme=dark]:[--sk-primary:#fafafa] sk:data-[sk-theme=dark]:[--sk-primary-foreground:#18181b] sk:data-[sk-theme=dark]:[--sk-danger:#fca5a5]",
  header: "sk:relative sk:pr-[88px]",
  merchant: "sk:text-inherit sk:font-semibold sk:text-[14px]",
  badge:
    "sk:absolute sk:top-0 sk:right-0 sk:px-2 sk:py-[3px] sk:rounded-[20px] sk:text-[10px] sk:bg-muted sk:text-subtle",
  caption: "sk:text-[12px] sk:text-subtle",
  amount:
    "sk:mt-1 sk:text-inherit sk:text-[38px] sk:font-semibold sk:tracking-[-1.4px] sk:leading-[1.2] sk:tabular-nums sk:[&_span]:text-[18px] sk:[&_span]:font-normal sk:[&_span]:tracking-normal sk:[&_span]:text-subtle",
  method:
    "sk:flex sk:items-center sk:gap-3 sk:border sk:border-solid sk:border-line sk:p-3 sk:rounded-control sk:[&_strong]:text-[14px] sk:[&_strong]:font-semibold",
  token:
    "sk:grid sk:place-items-center sk:shrink-0 sk:size-9 sk:rounded-full sk:bg-muted sk:text-[22px]",
  methodNote: "sk:ml-auto sk:text-[11px] sk:text-subtle",
  button:
    "sk:w-full sk:min-h-11 sk:border-0 sk:rounded-control sk:px-4 sk:py-3 sk:[font-family:inherit] sk:[line-height:inherit] sk:text-[14px] sk:font-medium sk:cursor-pointer sk:bg-brand sk:text-brand-foreground sk:hover:brightness-[0.92] sk:disabled:opacity-55 sk:disabled:cursor-default",
  status: "sk:grid sk:gap-3 sk:p-4 sk:rounded-control sk:bg-muted",
  statusIcon: "sk:text-[24px] sk:leading-none",
  complete: "sk:[&>p]:text-inherit sk:[&>p]:font-medium",
  error: "sk:p-3 sk:border sk:border-solid sk:border-current sk:rounded-control sk:text-danger",
  details:
    "sk:border-0 sk:border-t sk:border-solid sk:border-line sk:pt-4 sk:text-[12px] sk:[&_summary]:cursor-pointer sk:[&_summary]:font-medium sk:[&_dl]:grid sk:[&_dl]:gap-1 sk:[&_dl]:my-4 sk:[&_dl]:mx-0 sk:[&_dt:not(:first-child)]:mt-2",
  recipient: "sk:wrap-anywhere",
  footer: "sk:text-center sk:text-[11px]",
} as const;
