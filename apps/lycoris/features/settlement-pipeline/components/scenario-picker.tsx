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
        className="w-full min-w-0 flex-auto gap-2 px-3 text-xs text-foreground sm:w-auto sm:flex-none"
        aria-label="Payment scenario"
      >
        <span className="text-muted-foreground">Scenario:</span>
        <SelectValue>{SCENARIOS[selectedIndex]?.title}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {SCENARIOS.map((scenario, index) => (
          <SelectItem key={scenario.slot} value={String(index)} className="text-xs">
            {scenario.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
