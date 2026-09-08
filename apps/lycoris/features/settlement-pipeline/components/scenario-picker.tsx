"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { SCENARIOS } from "../lib/payment-demo";

export function ScenarioPicker({
  selectedIndex,
  loading,
  onSelect,
}: {
  selectedIndex: number;
  loading: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <Select
      value={String(selectedIndex)}
      onValueChange={(value) => onSelect(Number(value))}
      disabled={loading}
    >
      <SelectTrigger
        size="sm"
        className="w-full min-w-0 flex-auto gap-2 px-3 text-xs text-foreground sm:w-auto sm:flex-none max-[1023px]:data-[size=sm]:h-auto max-[1023px]:[&_[data-slot=select-value]]:line-clamp-none max-[1023px]:[&_[data-slot=select-value]]:whitespace-normal max-[1023px]:[&_[data-slot=select-value]]:text-left"
        aria-label="Payment scenario"
      >
        <span className="text-muted-foreground max-[1023px]:hidden">Scenario:</span>
        <SelectValue>{SCENARIOS[selectedIndex]?.title}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {SCENARIOS.map((scenario, index) => (
          <SelectItem
            key={scenario.slot}
            value={String(index)}
            className="text-xs max-[1023px]:min-h-11"
          >
            {scenario.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
