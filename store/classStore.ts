import { create } from 'zustand';
import { ensureMigrated, claimOrphanedRows } from '../lib/db/client';
import { ClassRecord, listClasses, createClass, updateClass, softDeleteClass } from '../lib/db/classesRepository';
import {
  StudentRecord,
  listAllStudents,
  createStudent,
  updateStudent,
  softDeleteStudent,
} from '../lib/db/studentsRepository';

type ClassStore = {
  hydrated: boolean;
  /** userId this store's data was hydrated for — guards mutations from running before hydrate()
   *  and lets reset()/hydrate() detect an account switch. */
  hydratedUserId: string | null;
  classes: ClassRecord[];
  students: StudentRecord[];
  /** Set when hydrate() fails (e.g. local database couldn't open/migrate) — lets the UI show a
   *  retry screen instead of leaving the splash screen up forever. User-facing text only, no
   *  technical detail (see AGENTS.md). */
  hydrateError: string | null;

  hydrate: (userId: string) => Promise<void>;
  /** Clears in-memory state on logout — SQLite rows stay put, scoped by userId, ready for the next
   *  hydrate() when someone logs back in. */
  reset: () => void;
  createClass: (record: ClassRecord) => Promise<void>;
  updateClass: (record: ClassRecord) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;

  createStudent: (record: StudentRecord) => Promise<void>;
  updateStudent: (record: StudentRecord) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
};

const initialState = {
  hydrated: false,
  hydratedUserId: null as string | null,
  classes: [] as ClassRecord[],
  students: [] as StudentRecord[],
  hydrateError: null as string | null,
};

export const useClassStore = create<ClassStore>((set, get) => ({
  ...initialState,

  hydrate: async (userId) => {
    try {
      await ensureMigrated();
      claimOrphanedRows(userId);
      const [classes, students] = await Promise.all([listClasses(userId), listAllStudents(userId)]);
      set({ classes, students, hydrated: true, hydratedUserId: userId, hydrateError: null });
    } catch {
      set({ hydrateError: 'Não foi possível carregar suas turmas. Verifique o espaço livre no aparelho e tente novamente.' });
    }
  },

  reset: () => set({ ...initialState }),

  createClass: async (record) => {
    const userId = get().hydratedUserId!;
    await createClass(record, userId);
    set({ classes: await listClasses(userId) });
  },

  updateClass: async (record) => {
    const userId = get().hydratedUserId!;
    await updateClass(record);
    set({ classes: await listClasses(userId) });
  },

  deleteClass: async (id) => {
    const userId = get().hydratedUserId!;
    await softDeleteClass(id);
    const studentsInClass = get().students.filter((student) => student.classId === id);
    await Promise.all(studentsInClass.map((student) => softDeleteStudent(student.id)));
    set({ classes: await listClasses(userId), students: await listAllStudents(userId) });
  },

  createStudent: async (record) => {
    const userId = get().hydratedUserId!;
    await createStudent(record, userId);
    set({ students: await listAllStudents(userId) });
  },

  updateStudent: async (record) => {
    const userId = get().hydratedUserId!;
    await updateStudent(record);
    set({ students: await listAllStudents(userId) });
  },

  deleteStudent: async (id) => {
    const userId = get().hydratedUserId!;
    await softDeleteStudent(id);
    set({ students: await listAllStudents(userId) });
  },
}));
