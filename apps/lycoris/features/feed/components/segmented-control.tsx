"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  label: string;
}) {
  return (
    <fieldset className="m-0 flex w-fit gap-0.5 rounded-none border border-border bg-muted/60 p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "h-auto rounded-none px-3 py-1.5 text-[12.5px] font-medium",
            value === option.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Button>
      ))}
    </fieldset>
  );
}
