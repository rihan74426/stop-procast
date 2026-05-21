"use server";
import { use } from "react";
import ProjectContent from "./ProjectPageClient";

// ─── ConfirmModal ─────────────────────────────────────────────────────

// ─── Project content ──────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { id } = await params;

  const SITE_URL =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://momentumio.vercel.app";

  try {
    const { tryConnectDB } = await import("@/lib/db/mongoose");
    const { default: Project } = await import("@/lib/models/Project");

    const db = await tryConnectDB();
    if (!db) throw new Error("no db");

    const project = await Project.findOne({ id })
      .select("projectTitle oneLineGoal scopeLevel phases tasks createdAt")
      .lean();

    if (!project) {
      return {
        title: "Project | Momentum",
        description: "Track your project execution with Momentum.",
      };
    }

    const title = `${project.projectTitle} | Momentum`;
    const description =
      project.oneLineGoal ||
      `A ${project.scopeLevel} project with ${
        project.phases?.length || 0
      } phases and ${project.tasks?.length || 0} tasks.`;

    const ogImageUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(
      project.projectTitle
    )}&desc=${encodeURIComponent(description.slice(0, 100))}&scope=${
      project.scopeLevel || "standard"
    }`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/project/${id}`,
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
      alternates: {
        canonical: `${SITE_URL}/project/${id}`,
      },
    };
  } catch {
    return {
      title: "Project | Momentum",
      description: "Track your project execution with Momentum.",
    };
  }
}

export default async function ProjectPage({ params }) {
  const param = await params;
  return <ProjectContent id={param.id} />;
}
