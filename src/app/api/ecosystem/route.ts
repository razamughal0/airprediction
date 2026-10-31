import { getDb } from "@/db";
import {
  academicRequests,
  auditLogs,
  backlogs,
  classrooms,
  courses,
  courseWithdrawals,
  crAssignments,
  enrollments,
  gpaRecords,
  sections,
  students,
  teachers,
  timetableEntries,
  users,
} from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { currentUser, apiError } from "@/lib/server";
import { calculateWeightedGpa, scoreToGrade } from "@/lib/air-university";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const db = getDb();
    const body = await request.json();
    const action = String(body.action || "");

    // 1. Timetable Scheduling & Conflict Detection Engine
    if (action === "update_timetable") {
      if (user.role !== "admin") {
        return Response.json({ error: "Only administrators can modify the university master timetable." }, { status: 403 });
      }
      const entryId = Number(body.entryId);
      const teacherId = Number(body.teacherId);
      const classroomId = Number(body.classroomId);
      const courseId = Number(body.courseId);

      const [existing] = await db.select().from(timetableEntries).where(eq(timetableEntries.id, entryId));
      if (!existing) return Response.json({ error: "Timetable slot not found." }, { status: 404 });

      const dayOfWeek = String(body.dayOfWeek || existing.dayOfWeek);
      const sessionSlot = String(body.sessionSlot || existing.sessionSlot);

      const allSlotEntries = await db
        .select()
        .from(timetableEntries)
        .where(
          and(
            eq(timetableEntries.dayOfWeek, dayOfWeek),
            eq(timetableEntries.sessionSlot, sessionSlot),
            ne(timetableEntries.id, entryId),
          ),
        );

      const allTeachers = await db.select().from(teachers);
      const allRooms = await db.select().from(classrooms);

      const teacherConflict = allSlotEntries.find((e) => e.teacherId === teacherId);
      if (teacherConflict) {
        const busyTeacherIds = new Set(allSlotEntries.map((e) => e.teacherId));
        const availableTeachers = allTeachers.filter((t) => !busyTeacherIds.has(t.id)).map((t) => t.name);
        return Response.json(
          {
            error: `Teacher conflict: ${teacherConflict.teacherName} is already teaching ${teacherConflict.courseCode} (${teacherConflict.sectionCode}) in ${teacherConflict.classroomCode} during ${dayOfWeek} ${sessionSlot}.`,
            conflictType: "teacher",
            suggestions: availableTeachers,
          },
          { status: 409 },
        );
      }

      const roomConflict = allSlotEntries.find((e) => e.classroomId === classroomId);
      if (roomConflict) {
        const busyRoomIds = new Set(allSlotEntries.map((e) => e.classroomId));
        const availableRooms = allRooms.filter((r) => !busyRoomIds.has(r.id)).map((r) => r.code);
        return Response.json(
          {
            error: `Classroom conflict: ${roomConflict.classroomCode} is already occupied by ${roomConflict.sectionCode} (${roomConflict.courseCode}) during ${dayOfWeek} ${sessionSlot}.`,
            conflictType: "classroom",
            suggestions: availableRooms,
          },
          { status: 409 },
        );
      }

      const [teacher] = allTeachers.filter((t) => t.id === teacherId);
      const [room] = allRooms.filter((r) => r.id === classroomId);
      const [course] = courseId ? await db.select().from(courses).where(eq(courses.id, courseId)) : [];

      if (!teacher || !room) {
        return Response.json({ error: "Select a valid teacher and classroom." }, { status: 400 });
      }

      const [updated] = await db
        .update(timetableEntries)
        .set({
          teacherId: teacher.id,
          teacherName: teacher.name,
          classroomId: room.id,
          classroomCode: room.code,
          ...(course ? { courseId: course.id, courseCode: course.code.replace(/-(AI|CS)$/, ""), courseName: course.name } : {}),
        })
        .where(eq(timetableEntries.id, entryId))
        .returning();

      await db.insert(auditLogs).values({
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "UPDATE_TIMETABLE",
        entityType: "timetable_entries",
        entityId: String(entryId),
        details: `Updated ${existing.sectionCode} (${dayOfWeek} ${sessionSlot}) -> Teacher: ${teacher.name}, Room: ${room.code}.`,
      });

      return Response.json({ ok: true, entry: updated });
    }

    // 2. Assign or Replace Section CR (Admin only)
    if (action === "assign_cr") {
      if (user.role !== "admin") {
        return Response.json({ error: "Only administrators can assign or replace Class Representatives." }, { status: 403 });
      }
      const sectionId = Number(body.sectionId);
      const studentId = Number(body.studentId);
      const [sec] = await db.select().from(sections).where(eq(sections.id, sectionId));
      const [stu] = await db.select().from(students).where(eq(students.id, studentId));
      if (!sec || !stu || stu.sectionId !== sec.id) {
        return Response.json({ error: "Select a student belonging to the target section." }, { status: 400 });
      }

      // Remove CR flag from previous CR in that section
      const sectionStudents = await db.select().from(students).where(eq(students.sectionId, sec.id));
      for (const s of sectionStudents) {
        if (s.isCr && s.id !== stu.id) {
          await db.update(students).set({ isCr: false }).where(eq(students.id, s.id));
          await db.update(users).set({ isCr: false }).where(eq(users.studentId, s.id));
        }
      }

      await db.update(students).set({ isCr: true }).where(eq(students.id, stu.id));
      await db.update(users).set({ isCr: true }).where(eq(users.studentId, stu.id));
      await db.update(sections).set({ crStudentId: stu.id }).where(eq(sections.id, sec.id));

      const [existingCr] = await db.select().from(crAssignments).where(eq(crAssignments.sectionId, sec.id));
      if (existingCr) {
        await db
          .update(crAssignments)
          .set({
            studentId: stu.id,
            studentName: stu.name,
            studentRegNo: stu.studentId,
            assignedBy: user.name,
            assignedAt: new Date(),
          })
          .where(eq(crAssignments.id, existingCr.id));
      } else {
        await db.insert(crAssignments).values({
          sectionId: sec.id,
          sectionCode: sec.code,
          programCode: sec.programCode,
          semesterNumber: sec.semesterNumber,
          studentId: stu.id,
          studentName: stu.name,
          studentRegNo: stu.studentId,
          assignedBy: user.name,
          status: "active",
        });
      }

      await db.insert(auditLogs).values({
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "ASSIGN_CR",
        entityType: "cr_assignments",
        entityId: sec.code,
        details: `Assigned ${stu.name} (${stu.studentId}) as Class Representative for ${sec.code}.`,
      });

      return Response.json({ ok: true });
    }

    // 3. Submit CR / Academic Request or Complaint
    if (action === "submit_request") {
      const requestType = String(body.requestType || "Academic Request");
      const subject = String(body.subject || "").trim();
      const description = String(body.description || "").trim();
      if (subject.length < 3 || description.length < 5) {
        return Response.json({ error: "Enter a clear subject and description." }, { status: 400 });
      }

      let stu = user.studentId
        ? (await db.select().from(students).where(eq(students.id, user.studentId)))[0]
        : undefined;
      if (!stu && body.studentId) {
        stu = (await db.select().from(students).where(eq(students.id, Number(body.studentId))))[0];
      }
      if (!stu) {
        stu = (await db.select().from(students).limit(1))[0];
      }

      const [created] = await db
        .insert(academicRequests)
        .values({
          studentId: stu.id,
          studentName: stu.name,
          sectionId: stu.sectionId || 1,
          sectionCode: stu.sectionCode,
          programCode: stu.course,
          requestType,
          subject,
          description,
          status: "open",
          submittedByCr: Boolean(stu.isCr || user.isCr),
        })
        .returning();

      return Response.json({ ok: true, request: created }, { status: 201 });
    }

    // 4. Resolve CR / Academic Request (Admin / Teacher)
    if (action === "resolve_request") {
      if (user.role === "student") {
        return Response.json({ error: "Only faculty or administrators can resolve academic requests." }, { status: 403 });
      }
      const requestId = Number(body.requestId);
      const status = String(body.status || "resolved");
      const responseNote = String(body.responseNote || "Reviewed and resolved by administration.");
      await db
        .update(academicRequests)
        .set({ status, responseNote })
        .where(eq(academicRequests.id, requestId));
      return Response.json({ ok: true });
    }

    // 5. Update Student Course Attendance & Marks + Auto-Recalculate GPA & CGPA
    if (action === "update_enrollment") {
      if (user.role === "student") {
        return Response.json({ error: "Students cannot edit attendance, marks, or GPA." }, { status: 403 });
      }
      const enrollmentId = Number(body.enrollmentId);
      const [enr] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId));
      if (!enr) return Response.json({ error: "Enrollment record not found." }, { status: 404 });

      const attendancePct = Math.max(0, Math.min(100, Number(body.attendancePct ?? enr.attendancePct)));
      const quizMarks = Math.max(0, Math.min(15, Number(body.quizMarks ?? enr.quizMarks)));
      const assignmentMarks = Math.max(0, Math.min(15, Number(body.assignmentMarks ?? enr.assignmentMarks)));
      const midtermMarks = Math.max(0, Math.min(30, Number(body.midtermMarks ?? enr.midtermMarks)));
      const finalMarks = Math.max(0, Math.min(40, Number(body.finalMarks ?? enr.finalMarks)));
      const totalMarks = Math.round(quizMarks + assignmentMarks + midtermMarks + finalMarks);
      const { letterGrade, gradePoints } = scoreToGrade(totalMarks);

      await db
        .update(enrollments)
        .set({
          attendancePct,
          quizMarks: quizMarks.toFixed(2),
          assignmentMarks: assignmentMarks.toFixed(2),
          midtermMarks: midtermMarks.toFixed(2),
          finalMarks: finalMarks.toFixed(2),
          totalMarks: totalMarks.toFixed(2),
          letterGrade,
          gradePoints: gradePoints.toFixed(2),
        })
        .where(eq(enrollments.id, enrollmentId));

      // Recompute student semester GPA & CGPA from all their enrollments
      const studentEnrollments = await db.select().from(enrollments).where(eq(enrollments.studentId, enr.studentId));
      const allCourses = await db.select().from(courses);
      const courseMap = Object.fromEntries(allCourses.map((c) => [c.id, c]));

      const breakdown = studentEnrollments.map((item) => {
        const c = courseMap[item.courseId];
        return {
          code: (c?.code || "CS").replace(/-(AI|CS)$/, ""),
          name: c?.name || "Course",
          creditHours: c?.creditHours || 3,
          marks: Number(item.totalMarks),
          grade: item.letterGrade,
          points: Number(item.gradePoints),
        };
      });

      const { totalCredits, qualityPoints, gpa } = calculateWeightedGpa(
        breakdown.map((b) => ({ creditHours: b.creditHours, gradePoints: b.points })),
      );
      const avgAtt = Math.round(
        studentEnrollments.reduce((sum, item) => sum + item.attendancePct, 0) / Math.max(1, studentEnrollments.length),
      );

      await db
        .update(students)
        .set({
          gpa: gpa.toFixed(2),
          cgpa: gpa.toFixed(2),
          attendance: avgAtt,
        })
        .where(eq(students.id, enr.studentId));

      await db
        .update(gpaRecords)
        .set({
          creditHours: totalCredits,
          qualityPoints: qualityPoints.toFixed(2),
          gpa: gpa.toFixed(2),
          cgpa: gpa.toFixed(2),
          courseBreakdown: breakdown,
        })
        .where(eq(gpaRecords.studentId, enr.studentId));

      await db.insert(auditLogs).values({
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: "UPDATE_MARKS_GPA",
        entityType: "enrollments",
        entityId: String(enrollmentId),
        details: `Updated marks/attendance for enrollment #${enrollmentId} -> Total: ${totalMarks}% (${letterGrade}), new GPA: ${gpa.toFixed(2)}.`,
      });

      return Response.json({ ok: true, gpa, letterGrade, totalMarks });
    }

    // 6. Update Backlog Status (Uncleared -> Cleared)
    if (action === "update_backlog") {
      if (user.role === "student") {
        return Response.json({ error: "Students cannot modify backlog records." }, { status: 403 });
      }
      const backlogId = Number(body.backlogId);
      const status = String(body.status || "cleared");
      await db
        .update(backlogs)
        .set({ status, clearedSemester: status === "cleared" ? 3 : null, updatedAt: new Date() })
        .where(eq(backlogs.id, backlogId));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unsupported ecosystem action." }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
