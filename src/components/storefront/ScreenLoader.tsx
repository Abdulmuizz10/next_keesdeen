import { fvIcon, mainLogo } from "@/assets";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";

interface LuxuryLoaderProps {
  onComplete: () => void;
}

const ScreenLoader = ({ onComplete }: LuxuryLoaderProps) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "exiting">("loading");

  useEffect(() => {
    const duration = 2400;
    const interval = 16;
    const steps = duration / interval;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const t = current / steps;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setProgress(Math.min(eased * 100, 100));

      if (current >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          setPhase("exiting");
          setTimeout(onComplete, 800);
        }, 300);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-9999 flex flex-col items-center justify-center"
        style={{ backgroundColor: "#FAFAFA" }}
        initial={{ opacity: 1 }}
        animate={phase === "exiting" ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      >
        {/* Grain texture on loader */}
        <div className="grain-overlay pointer-events-none absolute inset-0" />

        {/* Center logo area */}
        <div className="relative flex flex-col items-center justify-center max-w-5xl">
          {/* Brand logo */}
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
            animate={
              phase === "exiting"
                ? { opacity: 0, scale: 0.92, filter: "blur(4px)" }
                : { opacity: 1, scale: 1, filter: "blur(0px)" }
            }
            transition={{ duration: 1.2, ease: [0.77, 0, 0.175, 1] }}
          >
            {/* Subtle glow behind logo */}
            <div
              className="absolute -inset-8 rounded-full opacity-20"
              style={{
                background:
                  "radial-gradient(circle, rgba(196,162,101,0.15) 0%, transparent 70%)",
              }}
            />

            <Image
              src={mainLogo}
              alt="Brand logo"
              width={140}
              height={140}
              priority
              className="w-[140px] h-auto lg:w-[200px] lg:h-10"
            />

            {/* <h1
              className="relative text-center font-serif tracking-[0.35em] text-[--color-accent]"
              style={{
                fontSize: "clamp(2rem, 6vw, 4rem)",
                fontWeight: 300,
                textShadow: "0 2px 20px rgba(0,0,0,0.04)",
              }}
            >
              KEESDEEN
            </h1> */}
          </motion.div>
        </div>

        {/* Progress bar at bottom */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1px"
          style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "exiting" ? 0 : 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <motion.div
            className="h-full origin-left"
            style={{
              backgroundColor: "#C4A265",
              width: `${progress}%`,
              transition: "width 0.05s linear",
            }}
          />
        </motion.div>

        {/* Percentage counter */}
        <motion.div
          className="absolute bottom-6 right-8 font-sans text-[10px] tracking-[0.3em]"
          style={{ color: "#B0B0B0", fontWeight: 300 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "exiting" ? 0 : 0.6 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          {Math.round(progress)}%
        </motion.div>

        {/* Season label */}
        <motion.div
          className="absolute bottom-6 left-8 font-sans text-[10px] tracking-[0.3em]"
          style={{ color: "#B0B0B0", fontWeight: 300 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "exiting" ? 0 : 0.6 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          SS26
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ScreenLoader;
