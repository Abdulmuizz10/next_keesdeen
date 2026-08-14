"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const handlePrevious = () => {
    setDirection(-1);
    setSelectedIndex((p) => (p === 0 ? images.length - 1 : p - 1));
  };
  const handleNext = () => {
    setDirection(1);
    setSelectedIndex((p) => (p === images.length - 1 ? 0 : p + 1));
  };
  const handleThumbnailClick = (index: number) => {
    setDirection(index > selectedIndex ? 1 : -1);
    setSelectedIndex(index);
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d < 0 ? 60 : -60, opacity: 0 }),
  };

  if (images.length === 0) {
    return (
      <div className="aspect-3/4 bg-neutral-100 flex items-center justify-center">
        <span className="text-neutral-300 font-sans text-sm">No image</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-3/4 bg-neutral-100 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={selectedIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={images[selectedIndex]}
              alt={`${title} - ${selectedIndex + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={selectedIndex === 0}
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-neutral-500/60 hover:text-neutral-600 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-neutral-500/60 hover:text-neutral-600 transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={20} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`relative shrink-0 w-16 h-20 overflow-hidden transition-opacity duration-300 ${index === selectedIndex ? "opacity-100 border-b-2 border-neutral-600" : "opacity-50 hover:opacity-80"}`}
            >
              <Image
                src={image}
                alt={`${title} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
