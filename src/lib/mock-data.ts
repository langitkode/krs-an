import type { Course } from "../types";

export const MOCK_COURSES: Course[] = [
  {
    id: "1",
    code: "CS101",
    name: "Intro to Programming",
    sks: 3,
    class: "A",
    lecturer: "Dr. Smith",
    room: "Lab 1",
    schedule: [{ day: "Mon", start: "08:00", end: "10:30" }],
  },
  {
    id: "2",
    code: "CS101",
    name: "Intro to Programming",
    sks: 3,
    class: "B",
    lecturer: "Dr. Jones",
    room: "Lab 2",
    schedule: [{ day: "Tue", start: "13:00", end: "15:30" }],
  },
  {
    id: "3",
    code: "MATH201",
    name: "Calculus II",
    sks: 4,
    class: "A",
    lecturer: "Prof. Euler",
    room: "R101",
    schedule: [
      { day: "Wed", start: "08:00", end: "09:40" },
      { day: "Fri", start: "08:00", end: "09:40" },
    ],
  },
  {
    id: "4",
    code: "ENG102",
    name: "Academic Writing",
    sks: 2,
    class: "A",
    lecturer: "Ms. Woolf",
    room: "Lib 3",
    schedule: [{ day: "Thu", start: "10:00", end: "11:40" }],
  },
];
