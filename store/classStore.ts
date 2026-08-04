import { create } from 'zustand';
import { ensureMigrated } from '../lib/db/client';
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
  classes: ClassRecord[];
  students: StudentRecord[];

  hydrate: () => Promise<void>;
  createClass: (record: ClassRecord) => Promise<void>;
  updateClass: (record: ClassRecord) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;

  createStudent: (record: StudentRecord) => Promise<void>;
  updateStudent: (record: StudentRecord) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
};

export const useClassStore = create<ClassStore>((set, get) => ({
  hydrated: false,
  classes: [],
  students: [],

  hydrate: async () => {
    await ensureMigrated();
    const [classes, students] = await Promise.all([listClasses(), listAllStudents()]);
    set({ classes, students, hydrated: true });
  },

  createClass: async (record) => {
    await createClass(record);
    set({ classes: await listClasses() });
  },

  updateClass: async (record) => {
    await updateClass(record);
    set({ classes: await listClasses() });
  },

  deleteClass: async (id) => {
    await softDeleteClass(id);
    const studentsInClass = get().students.filter((student) => student.classId === id);
    await Promise.all(studentsInClass.map((student) => softDeleteStudent(student.id)));
    set({ classes: await listClasses(), students: await listAllStudents() });
  },

  createStudent: async (record) => {
    await createStudent(record);
    set({ students: await listAllStudents() });
  },

  updateStudent: async (record) => {
    await updateStudent(record);
    set({ students: await listAllStudents() });
  },

  deleteStudent: async (id) => {
    await softDeleteStudent(id);
    set({ students: await listAllStudents() });
  },
}));
