import mongoose from "mongoose";

// ─── Sub-schemas ──────────────────────────────────────────────────────

const TaskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: "" },
    status: {
      type: String,
      enum: ["todo", "doing", "done", "blocked"],
      default: "todo",
    },
    phaseId: { type: String, default: null },
    milestoneId: { type: String, default: null },
    deadline: { type: String, default: null },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    notes: { type: String, default: "" },
    createdAt: { type: String },
    completedAt: { type: String, default: null },
  },
  { _id: false }
);

const MilestoneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: "" },
    deadline: { type: String, default: null },
    doneWhen: { type: String, default: "" },
    risk: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "done", "missed"],
      default: "pending",
    },
    tasks: [String],
  },
  { _id: false }
);

const PhaseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: "" },
    objective: { type: String, default: "" },
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["upcoming", "active", "done"],
      default: "upcoming",
    },
    milestones: [MilestoneSchema],
  },
  { _id: false }
);

const BlockerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "resolved"], default: "active" },
    createdAt: { type: String },
    resolvedAt: { type: String, default: null },
  },
  { _id: false }
);

const PostmortemSchema = new mongoose.Schema(
  {
    completedAt: { type: String, default: null },
    answers: [{ question: String, answer: String }],
    stats: {
      daysToComplete: { type: Number, default: 0 },
      tasksCompleted: { type: Number, default: 0 },
      tasksAdded: { type: Number, default: 0 },
      blockersHit: { type: Number, default: 0 },
      milestonesOnTime: { type: Number, default: 0 },
      milestonesMissed: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

// ─── Main project schema ──────────────────────────────────────────────

const ProjectSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null },
    sessionId: { type: String, default: null },
    isAnonymous: { type: Boolean, default: true },

    // id is the app-level UUID; unique enforced only via schema.index below
    id: { type: String, required: true },
    projectTitle: { type: String, default: "" },
    oneLineGoal: { type: String, default: "" },
    problemStatement: { type: String, default: "" },
    targetUser: { type: String, default: "" },
    successCriteria: [String],
    scope: {
      mustHave: [String],
      niceToHave: [String],
      outOfScope: [String],
    },
    scopeLevel: {
      type: String,
      enum: ["lean", "standard", "ambitious"],
      default: "standard",
    },

    phases: [PhaseSchema],
    tasks: [TaskSchema],
    blockers: [BlockerSchema],

    dailyNextAction: { type: String, default: "" },
    toolsSuggested: [String],
    estimatedEffort: { type: String, default: "" },
    timeline: { type: String, default: "" },
    reviewQuestions: [String],

    streakDays: { type: Number, default: 0 },
    lastActivityAt: { type: String },
    createdAt: { type: String },
    completionDate: { type: String, default: null },

    postmortem: { type: PostmortemSchema, default: () => ({}) },
  },
  { timestamps: false }
);

// ─── Indexes (single source of truth — no duplicate declarations) ─────
ProjectSchema.index({ id: 1 }, { unique: true });
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ sessionId: 1, isAnonymous: 1 });
ProjectSchema.index({ id: 1, userId: 1 });
ProjectSchema.index({ id: 1, sessionId: 1 });

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);
