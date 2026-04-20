"use client";

import { useEffect } from "react";

export function ConfettiBlast() {
  useEffect(() => {
    let confetti;
    import("canvas-confetti").then((mod) => {
      confetti = mod.default;

      // First burst
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#7F77DD", "#1D9E75", "#BA7517", "#D85A30", "#F0F0F5"],
      });

      // Second burst — slight delay
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: ["#7F77DD", "#1D9E75", "#EEEDFE"],
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: ["#7F77DD", "#1D9E75", "#E1F5EE"],
        });
      }, 300);
    });
  }, []);

  return null;
}
