// Complete utility strings keep the layout discoverable by Tailwind's scanner.
const styles = {
  root: "min-w-0",
  layout:
    "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-12 pb-10 max-[761px]:grid-cols-1 max-[761px]:gap-7",
  story:
    "min-w-0 py-4 max-[761px]:py-0 max-[761px]:[&_h1]:mt-5 [&_h1]:text-display [&_h1]:font-medium [&_h1]:tracking-[-0.04em] [&_h1]:leading-[1.08]",
  weatherArt: "my-7 text-warning [&_svg]:size-28 max-[761px]:hidden",
  storyDescription: "mt-6 max-w-[390px] text-body leading-relaxed text-muted-foreground",
  preview:
    "min-w-0 w-full max-w-[560px] justify-self-end border border-border bg-card max-[761px]:max-w-none",
  checkoutBody:
    "flex justify-center p-5 max-[761px]:p-3 [&_.sk-checkout]:max-w-none [&_.sk-checkout]:border-0 [&_.sk-checkout]:p-0 [&_.sk-checkout]:shadow-none [&_.sk-merchant]:hidden [&_.sk-footer]:hidden",
  disclosure: "group min-w-0 border-t border-border last:border-b",
  summary:
    "flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-small font-medium [&::-webkit-details-marker]:hidden",
  controls: "grid grid-cols-2 gap-8 pb-6 max-[761px]:grid-cols-1 max-[761px]:gap-6",
  code: "min-w-0 overflow-hidden border border-border mb-6 [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere",
  appearance: "grid grid-cols-2 content-start gap-2 [&>p]:col-span-full [&>p]:mt-1",
} as const;

export default styles;
