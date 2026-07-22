"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring } from "framer-motion";

interface CountUpProps {
  value: number;
  format: (n: number) => string;
  className?: string;
}

export function CountUp({ value, format, className }: CountUpProps) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.6 });
  const [display, setDisplay] = useState(() => format(value));
  const reduceMotion = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (reduceMotion.current) {
      setDisplay(format(value));
      return;
    }
    motionValue.set(value);
  }, [value, motionValue, format]);

  useEffect(() => {
    if (reduceMotion.current) return;
    const unsub = spring.on("change", (v) => setDisplay(format(v)));
    return unsub;
  }, [spring, format]);

  return <span className={className}>{display}</span>;
}
