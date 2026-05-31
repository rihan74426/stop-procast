import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// ─── Sub-schemas ──────────────────────────────────────────────────────

const TaskSchema = new Schema(
  {
    id: String,
    title: { type: String, default: "" },
    status: { type: String, default: "todo" },
    phaseId: { type: String, default: null },
    milestoneId: { type: String, default: null },
    deadline: { type: String, default: null },
    priority: { type: String, default: "medium" },
    notes: { type: String, default: "" },
    createdAt: String,
    completedAt: { type: String, default: null },
  },
  { _id: false }
);

const MilestoneSchema = new Schema(
  {
    id: String,
    name: { type: String, default: "" },
    deadline: { type: String, default: null },
    doneWhen: { type: String, default: "" },
    risk: { type: String, default: "" },
    status: { type: String, default: "pending" },
    tasks: [String],
  },
  { _id: false }
);

const PhaseSchema = new Schema(
  {
    id: String,
    name: { type: String, default: "" },
    objective: { type: String, default: "" },
    order: { type: Number, default: 0 },
    status: { type: String, default: "upcoming" },
    milestones: [MilestoneSchema],
  },
  { _id: false }
);

const BlockerSchema = new Schema(
  {
    id: String,
    description: { type: String, default: "" },
    status: { type: String, default: "active" },
    createdAt: String,
    resolvedAt: { type: String, default: null },
  },
  { _id: false }
);

const PostmortemStatsSchema = new Schema(
  {
    daysToComplete: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksAdded: { type: Number, default: 0 },
    blockersHit: { type: Number, default: 0 },
    milestonesOnTime: { type: Number, default: 0 },
    milestonesMissed: { type: Number, default: 0 },
  },
  { _id: false }
);

const PostmortemSchema = new Schema(
  {
    completedAt: { type: String, default: null },
    answers: [
      {
        question: String,
        answer: String,
        _id: false,
      },
    ],
    stats: { type: PostmortemStatsSchema, default: () => ({}) },
  },
  { _id: false }
);

// ─── Root project schema ──────────────────────────────────────────────

const ProjectSchema = new Schema(
  {
    // Identity
    id: { type: String, required: true, unique: true },
    userId: { type: String, default: null },
    sessionId: { type: String, default: null },
    isAnonymous: { type: Boolean, default: false },

    // Core fields
    projectTitle: { type: String, default: "" },
    oneLineGoal: { type: String, default: "" },
    problemStatement: { type: String, default: "" },
    targetUser: { type: String, default: "" },
    successCriteria: { type: [String], default: [] },
    scope: {
      mustHave: { type: [String], default: [] },
      niceToHave: { type: [String], default: [] },
      outOfScope: { type: [String], default: [] },
    },
    scopeLevel: { type: String, default: "standard" },

    // Structure
    phases: { type: [PhaseSchema], default: [] },
    tasks: { type: [TaskSchema], default: [] },
    dailyNextAction: { type: String, default: "" },
    blockers: { type: [BlockerSchema], default: [] },
    resources: { type: [String], default: [] },
    toolsSuggested: { type: [String], default: [] },
    estimatedEffort: { type: String, default: "" },
    timeline: { type: String, default: "" },
    reviewQuestions: { type: [String], default: [] },

    // Progress tracking
    streakDays: { type: Number, default: 0 },
    lastActivityAt: { type: String },
    createdAt: { type: String },
    completionDate: { type: String, default: null },
    postmortem: { type: PostmortemSchema, default: () => ({}) },

    // Visibility — PUBLIC BY DEFAULT so explore works out of the box
    isPublic: { type: Boolean, default: true },
    publicQuality: { type: Number, default: null },
    publicSlug: { type: String, default: null },
    category: { type: String, default: null },
    tags: { type: [String], default: [] },
    forkedFrom: { type: String, default: null },

    // Engagement metrics — counts what builders contributed to the community
    views: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    starredBy: { type: [String], default: [] }, // sessionId or userId
    helpedCount: { type: Number, default: 0 },
    helpedBy: { type: [String], default: [] }, // sessionId or userId
    exportCount: { type: Number, default: 0 },
  },
  {
    timestamps: false,
    // Allow fields not in schema (backwards compat with older documents)
    strict: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────

ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ sessionId: 1, userId: 1 });
// Explore queries — note: uses $ne: false to catch legacy docs without isPublic set
ProjectSchema.index({ isPublic: 1, publicQuality: -1, createdAt: -1 });
ProjectSchema.index({ isPublic: 1, createdAt: -1 });
ProjectSchema.index({ isPublic: 1, stars: -1 });
ProjectSchema.index({ publicSlug: 1 }, { sparse: true });

// ─── Export ───────────────────────────────────────────────────────────

const Project = models.Project || model("Project", ProjectSchema);
export default Project;
