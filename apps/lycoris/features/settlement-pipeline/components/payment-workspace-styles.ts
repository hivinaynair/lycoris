// Shared SVG parts use the same state variants in the live run and preview.
const styles = {
  workspace:
    "min-h-0 min-w-0 max-[1023px]:flex max-[1023px]:flex-col border border-border bg-card text-foreground data-[moving=false]:[&_svg_*]:[animation-play-state:paused] motion-reduce:[&_svg_*]:animate-none! motion-reduce:[&_svg_*]:transition-none! machine-fit:grid machine-fit:h-[calc(100svh-var(--workspace-offset,86px))] machine-fit:grid-rows-[auto_minmax(0,1fr)_auto_auto]",
  intro:
    "max-[1023px]:order-1 grid grid-cols-2 gap-10 px-8 pt-[35px] [&_h1]:mt-0 [&_h1]:text-[clamp(26px,3vw,39px)] [&_h1]:font-medium [&_h1]:leading-[1.12] [&_h1]:tracking-[-0.045em] [&_h1_span]:text-muted-foreground max-[1023px]:grid-cols-1 max-[1023px]:gap-6 max-[1023px]:px-5 max-[1023px]:pt-[25px] machine-fit:gap-[30px] machine-fit:px-6 machine-fit:pt-[18px] machine-fit:[&_h1]:text-[clamp(26px,2.5vw,39px)]",
  scroll:
    "min-w-0 max-w-full max-[1023px]:order-4 overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-3 machine-fit:flex machine-fit:min-h-0 machine-fit:items-center machine-fit:overflow-hidden",
  stage: "relative min-w-[900px] machine-fit:min-w-0 machine-fit:w-full machine-fit:shrink-0",
  rig: "block h-auto w-full [&_text]:stroke-none",
  agentName: "text-[length:calc(15px*var(--rig-text-scale,1))] fill-foreground",
  guide:
    "fill-muted-foreground font-mono text-[length:calc(10px*var(--rig-text-scale,1))] tracking-[1.3px] [&_path]:stroke-border [&_path]:[stroke-dasharray:2_7]",
  wire: "group/wire fill-none stroke-border stroke-[1.5] data-[flow=preflight]:[&>path:first-child]:[stroke-dasharray:4_5] data-[state=approved]:stroke-chart-2 data-[state=rejected]:stroke-destructive data-[state=skipped]:[stroke-dasharray:3_6]",
  exchangeReveal: "animate-machine-reveal",
  packet:
    "stroke-primary stroke-3 [stroke-dasharray:7_29] opacity-0 group-data-[state=running]/wire:opacity-100 group-data-[state=running]/wire:animate-machine-travel group-data-[state=approved]/wire:opacity-70 group-data-[state=approved]/wire:animate-machine-travel-slow",
  wireLabel: "fill-muted-foreground font-mono text-[length:calc(10px*var(--rig-text-scale,1))]",
  returnLabel:
    "fill-muted-foreground font-mono text-[length:calc(10px*var(--rig-text-scale,1))] tracking-[1.8px]",
  station: "group/gate",
  gate: "group/gate",
  box: "fill-workspace-paper stroke-border stroke-[1.2] transition-[fill,stroke] duration-300 ease-[ease] in-[[data-state=running]]:stroke-primary in-[[data-state=running]]:fill-secondary in-[[data-state=rejected]]:stroke-destructive in-[[data-state=skipped]]:[stroke-dasharray:4_4]",
  lip: "fill-workspace-note-border data-[tone=challenge]:fill-workspace-note-blue-border data-[tone=settlement]:fill-chart-2 data-[tone=merchant]:fill-primary",
  nodeTitle: "text-[length:calc(14px*var(--rig-text-scale,1))] fill-foreground font-medium",
  subLabel: "font-mono text-[length:calc(8px*var(--rig-text-scale,1))] fill-muted-foreground",
  smallLabel:
    "font-mono text-[length:calc(10px*var(--rig-text-scale,1))] fill-muted-foreground tracking-[1px]",
  status:
    "font-mono text-[length:calc(8px*var(--rig-text-scale,1))] fill-muted-foreground tracking-[1px] in-[[data-state=rejected]]:fill-destructive",
  unit: "fill-card stroke-border",
  vent: "stroke-border",
  led: "fill-border in-[[data-state=running]]:fill-primary in-[[data-state=running]]:animate-machine-blink in-[[data-state=approved]]:fill-chart-2 in-[[data-state=rejected]]:fill-destructive",
  gateProgress:
    "stroke-border stroke-3 in-[[data-state=approved]]:stroke-chart-2 in-[[data-state=rejected]]:stroke-destructive",
  attestation: "fill-none stroke-muted-foreground stroke-1",
  cloud: "fill-workspace-note-blue stroke-workspace-note-blue-border stroke-[1.3]",
  readout:
    "mx-8 mt-[22px] flex items-center justify-between gap-6 border-t border-border p-0 max-[1023px]:contents min-[701px]:max-[1101px]:flex-col min-[701px]:max-[1101px]:items-stretch machine-fit:mx-6 machine-fit:mt-0",
  phase:
    "max-[1023px]:order-5 max-[1023px]:mx-5 max-[1023px]:my-5 max-[1023px]:items-start flex min-w-0 items-center gap-4 [&_h3]:text-[15px] [&_h3]:font-medium [&_p]:mt-[3px] [&_p]:text-xs [&_p]:leading-[1.6] [&_p]:text-muted-foreground [&_p]:wrap-anywhere machine-fit:[&>div]:min-h-[84px] machine-fit:[&>div]:flex machine-fit:[&>div]:flex-col machine-fit:[&>div]:justify-center",
  controls:
    "flex items-center flex-wrap gap-3 shrink-0 max-[1023px]:order-2 max-[1023px]:mx-5 max-[1023px]:my-6 max-[1023px]:grid max-[1023px]:grid-cols-1 min-[640px]:max-[1023px]:grid-cols-2 max-[1023px]:[&_button]:min-h-11 max-[1023px]:[&_button]:w-full max-[1023px]:[&_button]:text-sm",
  phaseNumber:
    "grid size-[42px] shrink-0 place-items-center bg-secondary font-mono text-[16px] leading-[normal] text-secondary-foreground",
  footer:
    "max-[1023px]:order-6 flex flex-wrap justify-between gap-2.5 border-t border-border bg-workspace-paper px-6 py-[13px] font-mono text-[10px] leading-[1.6] text-muted-foreground max-[1023px]:px-5 max-[1023px]:py-3 machine-fit:px-6 machine-fit:py-2",
  scrollHint:
    "hidden max-[1023px]:order-3 max-[1023px]:block max-[1023px]:px-5 max-[1023px]:pb-2 max-[1023px]:font-mono max-[1023px]:text-xs max-[1023px]:text-muted-foreground",
  robot: "group/robot fill-workspace-note-blue-border stroke-workspace-ink stroke-[0.7]",
  robotShadow: "fill-border stroke-none",
  robotHull: "fill-workspace-note-blue",
  visor: "fill-workspace-terminal",
  eye: "fill-primary stroke-none",
  robotCore: "fill-primary group-data-[stopped=true]/robot:fill-destructive",
  explanation:
    "mt-4 max-w-[47ch] text-sm leading-[1.65] text-muted-foreground machine-fit:mt-3 machine-fit:max-w-[54ch] machine-fit:text-[13px] machine-fit:leading-[1.6]",
  requestColumn:
    "w-full min-w-0 max-w-[380px] self-center justify-self-end max-[1023px]:max-w-none max-[1023px]:data-[has-response=false]:hidden",
  reportRequest: "flex flex-col items-start gap-2.5",
  reportResponse: "h-36 flex flex-col gap-3 max-[1023px]:h-auto max-[1023px]:max-h-64",
  reportReply: "min-h-0 overflow-y-auto text-[13px] leading-[1.6] wrap-anywhere",
} as const;

export default styles;
