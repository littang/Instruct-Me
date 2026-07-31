import * as fs from "node:fs";
import * as path from "node:path";

export interface ReviewQuestion {
  id: number;
  level?: string;
  title: string;
  answer: string;
  keywords: string[];
}

export interface ReviewSession {
  id: string;
  project: string;
  level: string;
  createdAt: string;
  questions: ReviewQuestion[];
}

interface SessionData {
  sessions: ReviewSession[];
}

function storagePathFor(projectPath: string): string {
  return path.join(projectPath, ".instruct-me", "sessions.json");
}

function readSessions(filePath: string): ReviewSession[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw) as SessionData;
      return data.sessions ?? [];
    }
  } catch {
    // ignore corrupted file
  }
  return [];
}

function writeSessions(filePath: string, sessions: ReviewSession[]): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify({ sessions }, null, 2), "utf-8");
  } catch {
    // silently fail - storage is optional
  }
}

export class SessionManager {
  add(project: string, level: string, questions: ReviewQuestion[]): ReviewSession | null {
    if (!project) {
      return null;
    }
    const session: ReviewSession = {
      id: `session_${Date.now()}`,
      project,
      level,
      createdAt: new Date().toISOString(),
      questions,
    };
    const filePath = storagePathFor(project);
    const sessions = readSessions(filePath);
    sessions.push(session);
    writeSessions(filePath, sessions);
    return session;
  }

  getLatest(project: string): ReviewSession | undefined {
    if (!project) {
      return undefined;
    }
    const sessions = readSessions(storagePathFor(project));
    return sessions[sessions.length - 1];
  }

  getAll(project: string): ReviewSession[] {
    if (!project) {
      return [];
    }
    return readSessions(storagePathFor(project));
  }
}
