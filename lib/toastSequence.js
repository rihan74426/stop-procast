import { toast } from "@/lib/toast";
import {
  FiCpu,
  FiSearch,
  FiHelpCircle,
  FiZap,
  FiCrosshair,
  FiMap,
  FiCheckCircle,
  FiFileText,
  FiAlertTriangle,
  FiTool,
  FiAward,
} from "react-icons/fi";

// Icon components for different operations
const ICONS = {
  spark: FiZap,
  search: FiSearch,
  help: FiHelpCircle,
  zap: FiZap,
  target: FiCrosshair,
  brain: FiCpu,
  map: FiMap,
  check: FiCheckCircle,
  file: FiFileText,
  alert: FiAlertTriangle,
  tool: FiTool,
  star: FiAward,
};

// Messages for different operations
const SEQUENCES = {
  questions: [
    {
      delay: 0,
      message: "Generating questions tailored to your idea…",
      icon: "spark",
    },
    {
      delay: 5000,
      message: "Analyzing your goal for deeper insight…",
      icon: "search",
    },
    {
      delay: 8000,
      message: "Crafting clarifying questions…",
      icon: "help",
    },
    {
      delay: 10000,
      message: "Almost there, polishing things up…",
      icon: "zap",
    },
    {
      delay: 12000,
      message: "Still working on your personalized questions…",
      icon: "target",
    },
  ],
  blueprint: [
    { delay: 0, message: "Analysing your idea…", icon: "brain" },
    { delay: 5000, message: "Mapping out your phases…", icon: "map" },
    {
      delay: 10000,
      message: "Defining success criteria…",
      icon: "target",
    },
    {
      delay: 15000,
      message: "Writing out tasks & milestones…",
      icon: "file",
    },
    {
      delay: 22000,
      message: "Identifying blockers & risks…",
      icon: "alert",
    },
    { delay: 30000, message: "Suggesting tools & resources…", icon: "tool" },
    {
      delay: 38000,
      message: "Finalising your blueprint…",
      icon: "star",
    },
  ],
};

/**
 * Creates a reusable toast sequence manager.
 * Pass 'questions' or 'blueprint' for context-specific messages.
 */
export function createToastSequence(context = "blueprint") {
  const messages = SEQUENCES[context] || SEQUENCES.blueprint;
  let currentToastId = null;
  let timeouts = [];
  let mounted = true;

  function dismissCurrent() {
    if (currentToastId !== null) {
      try {
        toast.dismiss(currentToastId);
      } catch {
        /* ignore */
      }
      currentToastId = null;
    }
  }

  function showMessage(message, iconKey) {
    dismissCurrent();
    const IconComponent = ICONS[iconKey];
    currentToastId = toast.loading(message, { icon: IconComponent });
  }

  function scheduleNext(messageIdx) {
    if (!mounted || messageIdx >= messages.length) return;

    const current = messages[messageIdx];
    const nextIdx = messageIdx + 1;
    const nextMsg = messages[nextIdx];

    // Show current message
    showMessage(current.message, current.icon);

    // Schedule next message if there is one
    if (nextMsg) {
      const delayUntilNext = nextMsg.delay - current.delay;
      const timeout = setTimeout(() => {
        if (mounted) scheduleNext(nextIdx);
      }, delayUntilNext);
      timeouts.push(timeout);
    }
  }

  return {
    /**
     * Start the engagement toast sequence.
     * Recommended: call this when you expect >1.5s wait time.
     */
    start: () => {
      if (mounted) {
        dismissCurrent();
        scheduleNext(0);
      }
    },

    /**
     * Stop the sequence and dismiss any active toast.
     */
    stop: () => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      dismissCurrent();
    },

    success: (message) => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      dismissCurrent();
      toast.success(message, { duration: 3000 });
    },

    error: (message) => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      dismissCurrent();
      toast.error(message, { duration: 5000 });
    },

    /**
     * Clean up resources (e.g. on unmount).
     * After this, start() won't work anymore.
     */
    unmount: () => {
      mounted = false;
      timeouts.forEach(clearTimeout);
      timeouts = [];
      dismissCurrent();
    },
  };
}
