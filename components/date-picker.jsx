"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"
import { format } from "@/lib/dateUtils"; // Or use date-fns/format if you prefer

export function DatePicker({ value, onChange, className }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`h-8 w-[96px] text-xs px-1 justify-start font-normal ${className || ""}`}
        >
          {value ? format(value, "yyyy-MM-dd") : <span className="text-gray-400">Pick date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
