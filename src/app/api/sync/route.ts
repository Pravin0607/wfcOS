import { auth } from "@/auth";
import prisma from "@/infrastructure/lib/prisma";
import { NextResponse } from "next/server";


interface NoteWithBigInt {
  id: string;
  name: string;
  content: string;
  lastModified: bigint;
  userId: string;
}

interface SessionWithBigInt {
  id: string;
  startTime: bigint;
  duration: number;
  taskId: string | null;
  date: string;
  userId: string;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [tasks, notes, workSessions, settings] = await Promise.all([
      prisma.task.findMany({ where: { userId } }),
      prisma.note.findMany({ where: { userId } }),
      prisma.workSession.findMany({ where: { userId } }),
      prisma.settings.findUnique({ where: { userId } }),
    ]);

    // Transform BigInt to Number for JSON serialization
    const safeNotes = (notes as unknown as NoteWithBigInt[]).map((note) => ({
      ...note,
      lastModified: Number(note.lastModified),
    }));
    
    const safeSessions = (workSessions as unknown as SessionWithBigInt[]).map((s) => ({
      ...s,
      startTime: Number(s.startTime),
    }));

    return NextResponse.json({
      tasks,
      notes: safeNotes,
      sessions: safeSessions,
      settings,
    });
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { tasks, notes, sessions, settings } = body;

  try {
    // Transaction to ensure data consistency within each feature
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // 1. Sync Tasks
      if (tasks && Array.isArray(tasks)) {
        // Simple strategy: Replace all (optimizable later)
        await tx.task.deleteMany({ where: { userId } });
        if (tasks.length > 0) {
          await tx.task.createMany({
            data: tasks.map((t: { id: string; content: string; category: string; createdAt?: string }) => ({
              id: t.id,
              content: t.content,
              category: t.category,
              userId,
              createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
              updatedAt: new Date(),
            })),
          });
        }
      }

      // 2. Sync Notes
      if (notes && Array.isArray(notes)) {
        await tx.note.deleteMany({ where: { userId } });
        if (notes.length > 0) {
          await tx.note.createMany({
            data: notes.map((n: { id: string; name: string; content: string; lastModified: number }) => ({
              id: n.id,
              name: n.name,
              content: n.content,
              lastModified: BigInt(n.lastModified),
              userId,
            })),
          });
        }
      }

      // 3. Sync Work Sessions
      if (sessions && Array.isArray(sessions)) {
        await tx.workSession.deleteMany({ where: { userId } });
        if (sessions.length > 0) {
          await tx.workSession.createMany({
            data: sessions.map((s: { id: string; startTime: number; duration: number; taskId?: string; date: string }) => ({
              id: s.id,
              startTime: BigInt(s.startTime),
              duration: s.duration,
              taskId: s.taskId || null,
              date: s.date,
              userId,
            })),
          });
        }
      }

      // 4. Sync Settings
      if (settings) {
        await tx.settings.upsert({
          where: { userId },
          update: {
            backgroundUrl: settings.url,
            backgroundFit: settings.fit,
          },
          create: {
            userId,
            backgroundUrl: settings.url,
            backgroundFit: settings.fit,
          },
        });
      }
    });


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json(
      { error: "Failed to sync data" },
      { status: 500 }
    );
  }
}
