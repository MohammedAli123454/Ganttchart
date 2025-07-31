// components/NumericInput.jsx
import React from "react";

export const NumericInput = React.forwardRef(function NumericInput(
  { value, onChange, min, max, className = "", ...props },
  ref
) {
  // Prevent wheel to change value (avoids accidental number changes on scroll)
  const handleWheel = (e) => e.target.blur();

  // Prevent non-numeric input and clamp to min/max on blur
  const handleInput = (e) => {
    let v = e.target.value.replace(/[^0-9.]/g, ""); // Remove non-numeric except dot
    if (v !== "" && min !== undefined && Number(v) < min) v = min;
    if (v !== "" && max !== undefined && Number(v) > max) v = max;
    onChange?.({ ...e, target: { ...e.target, value: v } });
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      ref={ref}
      min={min}
      max={max}
      autoComplete="off"
      onChange={handleInput}
      onWheel={handleWheel}
      className={`w-14 h-8 text-xs text-center bg-white outline-none transition-all
        border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-100
        rounded ${className}`}
      {...props}
    />
  );
});
