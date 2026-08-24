"use client";

import { useTheme } from "@/components/theme-provider";

function GrainOverlay({ filterId }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-85"
      style={{ mixBlendMode: "overlay" }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.7"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0.181 0.608 0.061 0 0.075 0.181 0.608 0.061 0 0.075 0.181 0.608 0.061 0 0.075 0 0 0 1 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
}

function ActuelLayers() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "linear-gradient(154deg, transparent 28%, rgba(31,103,99,0.12) 38%, rgba(48,137,130,0.35) 48%, rgba(25,78,75,0.18) 56%, transparent 68%)",
          mixBlendMode: "screen",
          filter: "blur(108px)",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-85 transform-gpu"
        style={{
          background:
            "radial-gradient(ellipse 70% 18% at 50% 52%, rgba(38,116,111,0.35) 0%, rgba(20,61,59,0.12) 48%, transparent 82%)",
          mixBlendMode: "screen",
          filter: "blur(90px)",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <GrainOverlay filterId="grain-actuel" />
    </>
  );
}

function AuroraLayers() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "radial-gradient(55.8% 55.49% at 50% 100%, rgb(38, 77, 76) 0%, rgba(25, 48, 47, 0) 100%)",
          mixBlendMode: "screen",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-aurora-beams pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background: `
            repeating-linear-gradient(
              100deg,
              #262626 0%,
              #262626 3%,
              rgba(38, 38, 38, 0.7) 5%,
              rgba(38, 38, 38, 0.7) 7%,
              transparent 10%,
              transparent 12%,
              rgba(38, 38, 38, 0.7) 14%,
              #262626 16%
            ),
            repeating-linear-gradient(
              100deg,
              #9ca3af 0%,
              #9ca3af 1.5%,
              rgba(156, 163, 175, 0.8) 2%,
              #6b7280 3%,
              #6b7280 4%,
              rgba(156, 163, 175, 0.8) 4.5%,
              #9ca3af 5%
            )
          `,
          backgroundSize: "300% 200%",
          mixBlendMode: "screen",
          opacity: 0.9,
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "radial-gradient(ellipse at 100% 100%, #ffffff 20%, #0a0a0a 80%)",
          mixBlendMode: "multiply",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <GrainOverlay filterId="grain-aurora" />
    </>
  );
}

function SmokeveilLayers() {
  return (
    <>
      <div
        className="aura-smokeveil-1 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "linear-gradient(155deg, transparent 8%, rgba(30,75,68,0.18) 28%, rgba(45, 53, 113, 0.45) 43%, rgba(23,65,59,0.22) 59%, transparent 82%)",
          mixBlendMode: "screen",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-smokeveil-2 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "radial-gradient(70% 42% at 45% 50%, rgba(53, 41, 112, 0.45) 0%, rgba(20,61,55,0.18) 48%, transparent 82%)",
          mixBlendMode: "screen",
          opacity: 0.9,
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-smokeveil-3 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "linear-gradient(25deg, transparent 25%, rgba(90, 94, 150, 0.25) 50%, transparent 75%)",
          mixBlendMode: "soft-light",
          opacity: 0.8,
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <GrainOverlay filterId="grain-smokeveil" />
    </>
  );
}

function BloodMoonLayers() {
  return (
    <>
      <div
        className="aura-bloodmoon-1 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "radial-gradient(ellipse 48% 52% at 40% 45%, rgba(220,38,38,0.9) 0%, transparent 60%)",
          mixBlendMode: "screen",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-bloodmoon-2 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "radial-gradient(ellipse 35% 40% at 70% 35%, rgba(153,27,27,0.7) 0%, transparent 65%)",
          mixBlendMode: "screen",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-bloodmoon-3 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "radial-gradient(ellipse 30% 35% at 25% 70%, rgba(239,68,68,0.5) 0%, transparent 55%)",
          mixBlendMode: "screen",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-bloodmoon-4 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "radial-gradient(ellipse 22% 25% at 60% 80%, rgba(185,28,28,0.4) 0%, transparent 60%)",
          mixBlendMode: "screen",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
    </>
  );
}

function SteelSpectrumLayers() {
  return (
    <>
      <div
        className="aura-steel-1 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "conic-gradient(from 200deg at 50% 55%, #334155, #64748b, #94a3b8, #475569, #1e293b, #334155)",
          mixBlendMode: "screen",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
      <div
        className="aura-steel-2 pointer-events-none absolute inset-0 transform-gpu"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.5) 0%, transparent 50%)",
          mixBlendMode: "multiply",
          transform: "translateZ(0)",
        }}
        aria-hidden="true"
      />
    </>
  );
}

const THEME_LAYERS = {
  actuel: ActuelLayers,
  aurora: AuroraLayers,
  smokeveil: SmokeveilLayers,
  bloodmoon: BloodMoonLayers,
  steelspectrum: SteelSpectrumLayers,
};

export function AuraBackground({ children }) {
  const { theme } = useTheme();
  const Layers = THEME_LAYERS[theme] || ActuelLayers;

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 z-0 isolate overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-background" aria-hidden />
        <Layers />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
