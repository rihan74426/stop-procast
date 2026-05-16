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
import { translations } from "@/lib/i18n/translations";

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

// Messages keyed by translation key + icon — locale resolved at call time
const SEQUENCE_DEFS = {
  questions: [
    { delayMs: 0, key: "clarify_toast_generating", icon: "spark" },
    { delayMs: 5000, key: "clarify_toast_analyzing", icon: "search" },
    { delayMs: 8000, key: "clarify_toast_crafting", icon: "help" },
    { delayMs: 10000, key: "clarify_toast_polishing", icon: "zap" },
    { delayMs: 12000, key: "clarify_toast_working", icon: "target" },
  ],
  blueprint: [
    { delayMs: 0, key: "blueprint_toast_analysing", icon: "brain" },
    { delayMs: 5000, key: "blueprint_toast_mapping", icon: "map" },
    { delayMs: 10000, key: "blueprint_toast_defining", icon: "target" },
    { delayMs: 15000, key: "blueprint_toast_writing", icon: "file" },
    { delayMs: 22000, key: "blueprint_toast_blockers", icon: "alert" },
    { delayMs: 30000, key: "blueprint_toast_tools", icon: "tool" },
    { delayMs: 38000, key: "blueprint_toast_finalising", icon: "star" },
  ],
};

/**
 * Resolve a translation key to a string for the given locale.
 * Falls back to English if key missing in locale.
 */
function tr(locale = "en", key) {
  const dict = translations[locale] || translations.en;
  return dict[key] || translations.en[key] || key;
}

/**
 * Creates a reusable toast sequence manager.
 *
 * @param {"questions"|"blueprint"} context
 * @param {string} locale  current app locale — pass from useI18n().locale
 */
export function createToastSequence(context = "blueprint", locale = "en") {
  const defs = SEQUENCE_DEFS[context] || SEQUENCE_DEFS.blueprint;
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

  function showMessage(key, iconKey) {
    dismissCurrent();
    const IconComponent = ICONS[iconKey];
    const message = tr(locale, key);
    currentToastId = toast.loading(message, { icon: IconComponent });
  }

  function scheduleNext(idx) {
    if (!mounted || idx >= defs.length) return;

    const current = defs[idx];
    const next = defs[idx + 1];

    showMessage(current.key, current.icon);

    if (next) {
      const delay = next.delayMs - current.delayMs;
      const t = setTimeout(() => {
        if (mounted) scheduleNext(idx + 1);
      }, delay);
      timeouts.push(t);
    }
  }

  return {
    /** Start the sequence. Call when you expect >1.5s wait. */
    start() {
      if (mounted) {
        dismissCurrent();
        scheduleNext(0);
      }
    },

    /** Stop and dismiss. */
    stop() {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      dismissCurrent();
    },

    success(message) {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      dismissCurrent();
      toast.success(message, { duration: 3000 });
    },

    error(message) {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      dismissCurrent();
      toast.error(message, { duration: 5000 });
    },

    /** Call on component unmount. */
    unmount() {
      mounted = false;
      timeouts.forEach(clearTimeout);
      timeouts = [];
      dismissCurrent();
    },
  };
}
