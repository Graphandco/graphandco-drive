/** Variantes Motion partagées — animations discrètes, pas de bruit. */

export const springSnappy = { type: "spring", stiffness: 420, damping: 32 };
export const springSoft = { type: "spring", stiffness: 280, damping: 28 };

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeScaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

export const slideUpIn = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 16 },
};

export const listItemIn = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
};

export const listItemTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1],
};

export function listItemDelay(index, stagger = 0.035, max = 0.45) {
  return Math.min(index * stagger, max);
}

export function staggerChildren(stagger = 0.03, delayChildren = 0.02) {
  return {
    animate: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}
