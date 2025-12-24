"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAtom } from "jotai";
import { useDebouncedCallback } from "use-debounce";
import { tasksAtom, TodoListState } from "@/application/atoms/todoListAtom";
import { notesAtom, Note } from "@/application/atoms/notepadAtom";
import { sessionsAtom } from "@/application/atoms/sessionAtoms";
import { backgroundSettingsAtom, BackgroundSettings } from "@/application/atoms/backgroundAtom";
import { Session } from "@/application/types/session.types";

interface SyncData {
  tasks?: TodoListState;
  notes?: Note[];
  sessions?: Session[];
  settings?: BackgroundSettings;
}

export function CloudSyncManager() {
  const { data: session } = useSession();
  const isHydrating = useRef(false);
  const hasLoaded = useRef(false);

  // Atoms
  const [tasks, setTasks] = useAtom(tasksAtom);
  const [notes, setNotes] = useAtom(notesAtom);
  const [sessions, setSessions] = useAtom(sessionsAtom);
  const [settings, setSettings] = useAtom(backgroundSettingsAtom);

  // Initial Data Fetch
  useEffect(() => {
    if (!session?.user) return;
    if (hasLoaded.current) return;

    const fetchData = async () => {
      isHydrating.current = true;
      try {
        const res = await fetch("/api/sync");
        if (!res.ok) throw new Error("Failed to fetch data");
        
        const data = await res.json();
        
        // Update local state if data exists on server
        if (data.tasks && data.tasks.length > 0) setTasks(data.tasks);
        
        if (data.notes && data.notes.length > 0) {
            setNotes(data.notes);
        }
        
        if (data.sessions && data.sessions.length > 0) setSessions(data.sessions);
        
        if (data.settings) {
            setSettings({
                url: data.settings.backgroundUrl,
                fit: data.settings.backgroundFit as BackgroundSettings["fit"]
            });
        }

      } catch (error) {
        console.error("Sync fetch error:", error);
      } finally {
        // buffer to prevent immediate write-back
        setTimeout(() => {
            isHydrating.current = false;
            hasLoaded.current = true;
        }, 1000);
      }
    };

    fetchData();
  }, [session, setTasks, setNotes, setSessions, setSettings]);

  // Debounced Save
  const saveToCloud = useDebouncedCallback(async (data: SyncData) => {
    if (!session?.user) return;
    if (isHydrating.current) return;

    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Sync save error:", error);
    }
  }, 2000);

  // Listeners
  // We separate them to avoid sending EVERYTHING on every small change, if possible.
  // But strictly, if we use one 'saveToCloud' it might be simpler to just pass the specific key.

  useEffect(() => {
    if (hasLoaded.current && !isHydrating.current) {
        saveToCloud({ tasks });
    }
  }, [tasks, saveToCloud]);

  useEffect(() => {
    if (hasLoaded.current && !isHydrating.current) {
        saveToCloud({ notes });
    }
  }, [notes, saveToCloud]);

  useEffect(() => {
    if (hasLoaded.current && !isHydrating.current) {
        saveToCloud({ sessions });
    }
  }, [sessions, saveToCloud]);

  useEffect(() => {
    if (hasLoaded.current && !isHydrating.current) {
        saveToCloud({ settings });
    }
  }, [settings, saveToCloud]);

  return null; // Headless component
}
