import api from "../services/api";

export async function downloadCompleteCurriculumBook({
    regulationCode,
    departmentCode,
    programCode,
    programName,
    specialization,
    curricula = [],
    subjectsMap = {},
}) {
    // 1. Gather all course and elective IDs that have syllabi
    const coursesToFetch = [];
    curricula.forEach((sem) => {
        (sem.courses || []).forEach((c) => {
            if (c.syllabusId) {
                coursesToFetch.push({ ...c, targetType: "COURSE" });
            }
        });
        (sem.electiveGroups || []).forEach((g) => {
            const subs = subjectsMap[g.id] || [];
            subs.forEach((s) => {
                if (s.syllabusId) {
                    coursesToFetch.push({ ...s, targetType: "ELECTIVE", groupName: g.name });
                }
            });
        });
    });
    // 2. Fetch full syllabus JSON for all subjects in parallel
    const syllabusDetailMap = {};
    await Promise.all(
        coursesToFetch.map(async (item) => {
            try {
                const res = await api.get(`/api/syllabi/${item.syllabusId}`);
                const data = res.data?.data || res.data;
                if (data?.syllabusData) {
                    syllabusDetailMap[item.syllabusId] = JSON.parse(data.syllabusData);
                }
            } catch (err) {
                console.warn(`Could not load syllabus for ${item.courseCode}`, err);
            }
        })
    );

    // Helpers
    const formatNum = (v) => {
        const n = Number(v) || 0;
        return Number.isInteger(n) ? n : Number(n.toFixed(2));
    };

    const getCredit = (item) => {
        const stored = Number(item?.credits);
        if (Number.isFinite(stored) && stored > 0) return stored;
        const l = Number(item?.lecture) || 0;
        const t = Number(item?.tutorial) || 0;
        const p = Number(item?.practical) || 0;
        return l + 0.5 * t + 0.5 * p;
    };

    const formatBookCitation = (b) => {
        if (!b) return "";
        if (typeof b === "string") {
            try {
                const parsed = JSON.parse(b);
                if (typeof parsed === "object") return formatBookCitation(parsed);
            } catch {
                return b;
            }
        }
        const parts = [];
        if (b.author?.trim()) parts.push(b.author.trim());
        if (b.title?.trim()) parts.push(`“${b.title.trim()}”`);
        if (b.edition?.trim()) parts.push(b.edition.trim());
        if (b.publisher?.trim()) parts.push(b.publisher.trim());
        if (b.year?.trim()) parts.push(b.year.trim());
        return parts.join(", ");
    };

    const parseResource = (raw) => {
        if (!raw) return null;
        if (typeof raw === "object") return raw;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === "object") return parsed;
        } catch {}
        return { platform: "Online Resource", topic: "", url: raw };
    };

    // Header formats including Specialization in parenthesis if available
    const cleanProgramName = (programName || programCode || "").trim();
    const cleanSpec = (specialization || "").trim();

    const titleWithSpecialization = cleanSpec
        ? `${cleanProgramName} (${cleanSpec})`
        : cleanProgramName;

    const fullProgramHeader = `${titleWithSpecialization}`.trim();

    const normalizeGroupTitle = (name = "", electiveType = "") => {
        let clean = name
            .replace(/[\s\-_–—]+(I{1,3}|IV|V|VI|VII|VIII|\d+)\b/gi, "")
            .replace(/\s*\([^\)]*\)/g, "")
            .trim();

        if (!clean && electiveType) {
            clean = electiveType.replace(/_/g, " ").trim();
        }

        if (clean.toLowerCase().endsWith("elective")) {
            clean += "s";
        }
        return clean || name || "Electives";
    };

    const getSemesterTracks = (sem) => {
        const semNum = Number(sem.semester);
        const courses = (sem.courses || []).filter((c) => {
            const code = String(c?.courseCode || "").trim().toUpperCase();
            return !code.includes("HN") && !code.includes("MN");
        });
        const electives = sem.electiveGroups || [];

        const isAltCourse = (c) => {
            if (c.isAlternative === true || Boolean(c.isAlternative)) return true;
            const name = (c.courseName || "").toLowerCase();
            if (name.includes("capstone")) return false;
            const credits = Number(c.credits) || 0;
            const isIndustrial = name.includes("industrial project") || name.includes("internship");
            if ((semNum === 3 || semNum === 7) && (isIndustrial || credits >= 15)) {
                return true;
            }
            return false;
        };

        const altCourses = courses.filter(isAltCourse);
        const mainCourses = courses.filter((c) => !isAltCourse(c));

        return {
            hasAltTrack: altCourses.length > 0,
            track1Courses: mainCourses,
            track1Electives: electives,
            track2Courses: altCourses,
        };
    };

    // Detect swappable symbols (*, #, $) across Semester 1 and 2 courses
    const detectSwappableNotesForSem2 = () => {
        const sem1And2 = curricula.filter((s) => Number(s.semester) === 1 || Number(s.semester) === 2);
        let hasStar = false;
        let hasHash = false;
        let hasDollar = false;

        sem1And2.forEach((sem) => {
            (sem.courses || []).forEach((c) => {
                const name = (c.courseName || "").trim();
                if (name.endsWith("*")) hasStar = true;
                if (name.endsWith("#")) hasHash = true;
                if (name.endsWith("$")) hasDollar = true;
            });
            (sem.electiveGroups || []).forEach((g) => {
                const name = (g.name || "").trim();
                if (name.endsWith("*")) hasStar = true;
                if (name.endsWith("#")) hasHash = true;
                if (name.endsWith("$")) hasDollar = true;

                const subs = subjectsMap[g.id] || [];
                subs.forEach((s) => {
                    const sName = (s.courseName || "").trim();
                    if (sName.endsWith("*")) hasStar = true;
                    if (sName.endsWith("#")) hasHash = true;
                    if (sName.endsWith("$")) hasDollar = true;
                });
            });
        });

        const notes = [];
        if (hasStar) notes.push("* SWAPPABLE BETWEEN I AND II SEMESTER");
        if (hasHash) notes.push("# SWAPPABLE BETWEEN I AND II SEMESTER");
        if (hasDollar) notes.push("$ SWAPPABLE BETWEEN I AND II SEMESTER");
        return notes;
    };

    const sem2SwappableNotes = detectSwappableNotesForSem2();

    const consolidatedElectivePools = {};
    curricula.forEach((sem) => {
        (sem.electiveGroups || []).forEach((grp) => {
            const poolName = normalizeGroupTitle(grp.name, grp.electiveType);
            if (!consolidatedElectivePools[poolName]) {
                consolidatedElectivePools[poolName] = {
                    title: poolName,
                    electiveType: grp.electiveType || "Elective",
                    subjectsByCode: new Map(),
                };
            }

            const subs = subjectsMap[grp.id] || [];
            subs.forEach((sub) => {
                const code = String(sub.courseCode || "").trim().toUpperCase();
                if (code && !consolidatedElectivePools[poolName].subjectsByCode.has(code)) {
                    consolidatedElectivePools[poolName].subjectsByCode.set(code, sub);
                }
            });
        });
    });

    const flexibleCourses = [
        { code: "25HUM202CR401", title: "Industry Certification", l: 2, r: 0, p: 2, c: 3 },
        { code: "25HUM300CR402", title: "Professional Skill Development", l: 3, r: 0, p: 0, c: 3 },
        { code: "25HUM300CR403", title: "Self-Paced Learning", l: 3, r: 0, p: 0, c: 3 }
    ];

    const specialCasesNotes = [
        "In Special Cases Open Electives may be considered as Program Electives",
        "In Special Cases Program Electives may be considered as Open Electives",
        "In Special Cases Program Electives may be considered as Specialization Electives",
        "In Special Cases Specialization Electives may be considered as Program Electives",
        "In Special Cases Specialization Electives may be considered as Open Electives",
        "In Special Cases Open Electives may be considered as Specialization Electives",
        "In Special Cases Open Electives may be considered as LHS Electives",
        "In Special Cases LHS Electives may be considered as Open Electives"
    ];

    const printWindow = window.open("", "_blank", "width=1000,height=900");
    if (!printWindow) {
        alert("Please allow popups to download the complete Curriculum Book");
        return;
    }

    const printedSyllabusCodes = new Set();

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${regulationCode}_${departmentCode}_${programCode}_Curriculum_Book</title>
        <style>
            @page {
                size: A4;
                margin: 14mm 12mm;
            }
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                color: #111;
                font-size: 9.5pt;
                line-height: 1.35;
                margin: 0;
                padding: 0;
            }
            .syllabus-page-break {
                page-break-before: always;
            }
            .cover-page {
                text-align: center;
                padding: 60px 20px 30px 20px;
                border-bottom: 2px solid #0d6efd;
                margin-bottom: 20px;
            }
            .cover-title {
                font-size: 20pt;
                font-weight: 800;
                color: #0d6efd;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .cover-subtitle {
                font-size: 13pt;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 12px;
            }
            .cover-meta {
                font-size: 14pt;
                color: #1e293b;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 20px;
            }
            .semester-block {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            .section-header {
                background: #0d6efd;
                color: white;
                padding: 6px 10px;
                font-weight: bold;
                font-size: 10.5pt;
                border-radius: 3px;
                margin-bottom: 6px;
            }
            .or-divider {
                background: #e2e8f0;
                color: #334155;
                text-align: center;
                font-weight: bold;
                font-size: 9pt;
                padding: 4px;
                text-transform: uppercase;
                letter-spacing: 1px;
                border: 1px solid #cbd5e1;
                border-top: none;
                border-bottom: none;
            }
            table.curriculum-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 6px;
                font-size: 8.8pt;
            }
            table.curriculum-table th, table.curriculum-table td {
                border: 1px solid #333;
                padding: 5px 6px;
                text-align: center;
            }
            table.curriculum-table th {
                background-color: #f1f5f9;
                font-weight: 600;
            }
            .swappable-note {
                color: #dc3545;
                font-style: italic;
                font-size: 8pt;
                font-weight: 600;
                margin-top: 3px;
                margin-bottom: 2px;
                text-align: left;
            }
            table.syllabus-meta-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
            }
            table.syllabus-meta-table td {
                border: 1px solid #333;
                padding: 4px 8px;
                font-size: 9pt;
            }
            .syllabus-box {
                border: 1px solid #cbd5e1;
                border-radius: 5px;
                padding: 14px;
                margin-bottom: 22px;
                background: #fff;
                page-break-inside: avoid;
            }
            .syllabus-heading {
                font-size: 10.5pt;
                font-weight: 700;
                border-bottom: 1.5px solid #0d6efd;
                padding-bottom: 2px;
                margin-top: 10px;
                margin-bottom: 5px;
                text-transform: uppercase;
                color: #0f172a;
            }
            .topic-list {
                list-style-type: none;
                padding-left: 0;
                margin-top: 3px;
                margin-bottom: 8px;
            }
            .topic-item {
                margin-bottom: 3px;
                display: flex;
                align-items: flex-start;
            }
            .topic-num {
                min-width: 24px;
                font-weight: bold;
                color: #1e293b;
            }
            ol, ul {
                margin-top: 3px;
                margin-bottom: 8px;
                padding-left: 18px;
            }
            li {
                margin-bottom: 2px;
            }
        </style>
    </head>
    <body>
        <!-- PROGRAM TITLE HEADER -->
        <div class="cover-page">
            <div style="font-size: 12pt; font-weight: bold; color: #64748b; margin-bottom: 4px;">SR UNIVERSITY, WARANGAL</div>
            <div class="cover-title">Curriculum & Course Structure</div>
            <div class="cover-meta">
                <div><strong>Regulation:</strong> ${regulationCode}</div>
                <div><strong>Department:</strong> ${departmentCode}</div>
                <div><strong>Programme:</strong> ${cleanProgramName}</div>
                ${cleanSpec ? `<div><strong>Specialization(s):</strong> ${cleanSpec}</div>` : ""}
            </div>
        </div>

        <!-- 1. SEMESTER-WISE TABLES -->
        ${curricula.map((sem) => {
            const { hasAltTrack, track1Courses, track1Electives, track2Courses } = getSemesterTracks(sem);
            if (track1Courses.length === 0 && track1Electives.length === 0 && track2Courses.length === 0) return "";

            let t1L = 0, t1R = 0, t1P = 0, t1C = 0;
            let t2L = 0, t2R = 0, t2P = 0, t2C = 0;
            const isSem2 = Number(sem.semester) === 2;

            return `
            <div class="semester-block">
                <div class="section-header">
                    Semester ${sem.semester} - ${fullProgramHeader}
                </div>
                <table class="curriculum-table">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width: 40px;">S.No</th>
                            <th rowspan="2" style="width: 140px;">Course Code</th>
                            <th rowspan="2" style="text-align: left; padding-left: 8px;">Course Title</th>
                            <th colspan="4">Hours / Week</th>
                        </tr>
                        <tr>
                            <th style="width: 45px;">L</th>
                            <th style="width: 45px;">R</th>
                            <th style="width: 45px;">P</th>
                            <th style="width: 50px;">C</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- TRACK 1 -->
                        ${track1Courses.map((c, idx) => {
                            t1L += Number(c.lecture) || 0;
                            t1R += Number(c.tutorial) || 0;
                            t1P += Number(c.practical) || 0;
                            t1C += getCredit(c);

                            return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td style="font-weight: 600;">${c.courseCode || "-"}</td>
                                <td style="text-align: left; padding-left: 8px; font-weight: 500;">${c.courseName}</td>
                                <td>${formatNum(c.lecture)}</td>
                                <td>${formatNum(c.tutorial)}</td>
                                <td>${formatNum(c.practical)}</td>
                                <td style="font-weight: bold;">${formatNum(getCredit(c))}</td>
                            </tr>
                            `;
                        }).join("")}

                        <!-- TRACK 1 ELECTIVES -->
                        ${track1Electives.map((g, gIdx) => {
                            t1L += Number(g.lecture) || 0;
                            t1R += Number(g.tutorial) || 0;
                            t1P += Number(g.practical) || 0;
                            t1C += getCredit(g);

                            return `
                            <tr style="background-color: #f8fafc;">
                                <td>${track1Courses.length + gIdx + 1}</td>
                                <td>-</td>
                                <td style="text-align: left; padding-left: 8px; font-weight: 600; color: #0d6efd;">
                                    ${g.name} (Elective Slot)
                                </td>
                                <td>${formatNum(g.lecture)}</td>
                                <td>${formatNum(g.tutorial)}</td>
                                <td>${formatNum(g.practical)}</td>
                                <td style="font-weight: bold;">${formatNum(getCredit(g))}</td>
                            </tr>
                            `;
                        }).join("")}

                        <!-- TRACK 1 TOTAL -->
                        <tr style="background: #f1f5f9; font-weight: bold;">
                            <td colspan="3" style="text-align: right; padding-right: 12px;">${hasAltTrack ? "Total (Option 1)" : "Total"}</td>
                            <td>${formatNum(t1L)}</td>
                            <td>${formatNum(t1R)}</td>
                            <td>${formatNum(t1P)}</td>
                            <td>${formatNum(t1C)}</td>
                        </tr>

                        <!-- ALTERNATIVE TRACK ("OR") -->
                        ${hasAltTrack ? `
                            <tr>
                                <td colspan="7" class="or-divider">--- OR ---</td>
                            </tr>
                            ${track2Courses.map((c, idx) => {
                                t2L += Number(c.lecture) || 0;
                                t2R += Number(c.tutorial) || 0;
                                t2P += Number(c.practical) || 0;
                                t2C += getCredit(c);

                                return `
                                <tr style="background-color: #fffdf5;">
                                    <td>${idx + 1}</td>
                                    <td style="font-weight: 600;">${c.courseCode || "-"}</td>
                                    <td style="text-align: left; padding-left: 8px; font-weight: 500;">${c.courseName}</td>
                                    <td>${formatNum(c.lecture)}</td>
                                    <td>${formatNum(c.tutorial)}</td>
                                    <td>${formatNum(c.practical)}</td>
                                    <td style="font-weight: bold;">${formatNum(getCredit(c))}</td>
                                </tr>
                                `;
                            }).join("")}

                            <tr style="background: #f1f5f9; font-weight: bold;">
                                <td colspan="3" style="text-align: right; padding-right: 12px;">Total (Option 2)</td>
                                <td>${formatNum(t2L)}</td>
                                <td>${formatNum(t2R)}</td>
                                <td>${formatNum(t2P)}</td>
                                <td>${formatNum(t2C)}</td>
                            </tr>
                        ` : ""}
                    </tbody>
                </table>

                <!-- SWAPPABLE NOTES PRINTED ONLY AFTER SEMESTER 2 -->
                ${isSem2 && sem2SwappableNotes.length > 0 ? `
                    <div style="margin-top: 4px; padding-left: 4px;">
                        ${sem2SwappableNotes.map(note => `<div class="swappable-note">${note}</div>`).join("")}
                    </div>
                ` : ""}
            </div>
            `;
        }).join("")}

        <!-- 2. CONSOLIDATED ELECTIVES -->
        <div class="semester-block" style="margin-top: 25px;">
            <div class="section-header">Elective Groups & Buckets - ${fullProgramHeader}</div>
            ${Object.values(consolidatedElectivePools).map((pool) => {
                const uniqueSubs = Array.from(pool.subjectsByCode.values());
                return `
                <div style="margin-bottom: 18px;">
                    <div style="font-weight: bold; font-size: 10pt; color: #1e293b; margin-bottom: 5px;">
                        ${pool.title}
                    </div>
                    <table class="curriculum-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">#</th>
                                <th style="width: 140px;">Subject Code</th>
                                <th style="text-align: left; padding-left: 8px;">Subject Title</th>
                                <th style="width: 60px;">Dept</th>
                                <th style="width: 45px;">L</th>
                                <th style="width: 45px;">R</th>
                                <th style="width: 45px;">P</th>
                                <th style="width: 50px;">C</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${uniqueSubs.length === 0 ? `<tr><td colspan="8" style="color: #94a3b8;">No subjects in this group</td></tr>` : 
                            uniqueSubs.map((s, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td style="font-weight: bold;">${s.courseCode || "-"}</td>
                                <td style="text-align: left; padding-left: 8px;">${s.courseName}</td>
                                <td>${s.offeringDepartment || "-"}</td>
                                <td>${formatNum(s.lecture)}</td>
                                <td>${formatNum(s.tutorial)}</td>
                                <td>${formatNum(s.practical)}</td>
                                <td style="font-weight: bold;">${formatNum(getCredit(s))}</td>
                            </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
                `;
            }).join("")}

            <!-- 2b. FLEXIBLE COURSES & SPECIAL CASES -->
            <div style="margin-top: 25px; margin-bottom: 20px;">
                <table class="curriculum-table" style="margin-bottom: 0;">
                    <thead>
                        <tr style="background-color: #60a5fa; color: #000;">
                            <th colspan="7" style="background-color: #60a5fa; font-weight: bold; font-size: 10pt; text-align: center; padding: 6px;">
                                Flexible Courses for Open Electives and Professional Electives
                            </th>
                        </tr>
                        <tr>
                            <th style="width: 45px;">S.No.</th>
                            <th style="width: 140px;">Course Code</th>
                            <th style="text-align: left; padding-left: 8px;">Course</th>
                            <th style="width: 45px;">L</th>
                            <th style="width: 45px;">R</th>
                            <th style="width: 45px;">P</th>
                            <th style="width: 50px;">C</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${flexibleCourses.map((fc, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td style="font-weight: 600;">${fc.code}</td>
                            <td style="text-align: left; padding-left: 8px;">${fc.title}</td>
                            <td>${fc.l}</td>
                            <td>${fc.r}</td>
                            <td>${fc.p}</td>
                            <td style="font-weight: bold;">${fc.c}</td>
                        </tr>
                        `).join("")}
                        ${specialCasesNotes.map((note) => `
                        <tr>
                            <td colspan="7" style="text-align: left; padding-left: 10px; font-size: 8.8pt; color: #1e293b; background-color: #fff;">
                                ${note}
                            </td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 3. DETAILED SYLLABI (CONTINUOUS NUMBERING 1, 2, 3... ACROSS UNITS) -->
        <div class="syllabus-page-break"></div>
        <div class="section-header" style="margin-bottom: 18px;">
            Detailed Syllabi - ${fullProgramHeader}
        </div>

        ${curricula.map((sem) => {
            const semCourses = sem.courses || [];
            const semElectives = sem.electiveGroups || [];

            // Helper to render unit-wise syllabus with continuous sequential numbering
            const renderUnitsHtml = (units, L) => {
                if (!L || !units?.length) return "";
                let runningSessionNumber = 1;

                return `
                <div class="syllabus-heading">Unit-Wise Syllabus (Theory - ${L * 12} Sessions)</div>${units.map((u, uIdx) => {
                    const topicsList = u.topics || [];
                    return `
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #0f172a;">${u.title}</strong>
                        <div class="topic-list" style="margin-top: 3px; padding-left: 4px;">
                            ${topicsList.map((t) => {
                                const currentNum = runningSessionNumber++;
                                return `
                                <div class="topic-item">
                                    <span class="topic-num">${currentNum}.</span>
                                    <span>${t}</span>
                                </div>
                                `;
                            }).join("")}
                        </div>
                    </div>
                    `;
                }).join("")}
                `;
            };

            const courseSyllabiHtml = semCourses.map((course) => {
                const code = String(course.courseCode || "").trim().toUpperCase();
                if (!code || printedSyllabusCodes.has(code)) return "";
                const sData = syllabusDetailMap[course.syllabusId];
                if (!sData) return "";

                printedSyllabusCodes.add(code);

                const L = Number(course.lecture) || 0;
                const R = Number(course.tutorial) || 0;
                const P = Number(course.practical) || 0;
                const C = Number(course.credits) || 0;

                const parsedResources = (sData.onlineResources || [])
                    .map(parseResource)
                    .filter(Boolean);

                return `
                <div class="syllabus-box">
                    <div style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">
                        Semester ${sem.semester} • Course Syllabus
                    </div>
                    <table class="syllabus-meta-table">
                        <tr>
                            <td colspan="3" style="font-weight: bold; font-size: 10.5pt;">
                                <div style="color: #0d6efd;">${course.courseCode || ""}</div>
                                <div>${course.courseName || ""}</div>
                            </td>
                            <td style="width: 35px; text-align: center; font-weight: bold;">L</td>
                            <td style="width: 35px; text-align: center; font-weight: bold;">R</td>
                            <td style="width: 35px; text-align: center; font-weight: bold;">P</td>
                            <td style="width: 35px; text-align: center; font-weight: bold;">C</td>
                        </tr>
                        <tr>
                            <td colspan="3" style="font-size: 8.5pt; color: #475569;">Credit Structure</td>
                            <td style="text-align: center; font-weight: bold;">${L}</td>
                            <td style="text-align: center; font-weight: bold;">${R}</td>
                            <td style="text-align: center; font-weight: bold;">${P}</td>
                            <td style="text-align: center; font-weight: bold;">${C}</td>
                        </tr>
                        <tr>
                            <td style="width: 110px; font-weight: bold; background: #f8fafc;">Course type</td>
                            <td>${sData.courseType || "Engineering Science"}</td>
                            <td style="width: 110px; font-weight: bold; background: #f8fafc;">Pre-requisite</td>
                            <td colspan="4">${sData.prerequisite || "NA"}</td>
                        </tr>
                    </table>

                    <div class="syllabus-heading">Course Outcomes:</div>
                    <ul style="list-style-type: none; padding-left: 0;">
                        ${(sData.courseOutcomes || []).map((co, i) => `<li><strong>CO${i + 1}:</strong> ${co}</li>`).join("")}
                    </ul>

                    ${renderUnitsHtml(sData.units, L)}

                    ${R > 0 && sData.recitations?.length ? `
                        <div class="syllabus-heading">Recitation / Tutorial Topics (${R * 12} Sessions)</div>
                        <ol>${sData.recitations.map(r => `<li>${r}</li>`).join("")}</ol>
                    ` : ""}

                    ${P > 0 && sData.labComponents?.length ? `
                        <div class="syllabus-heading">Lab / Product Components (${Math.round((P / 2) * 12)} Sessions)</div>
                        <ol>${sData.labComponents.map(l => `<li>${l}</li>`).join("")}</ol>
                    ` : ""}

                    ${sData.textbooks?.length ? `
                        <div class="syllabus-heading">Textbooks</div>
                        <ol>${sData.textbooks.map(tb => `<li>${formatBookCitation(tb)}</li>`).join("")}</ol>
                    ` : ""}

                    ${sData.referenceBooks?.length ? `
                        <div class="syllabus-heading">Reference Books</div>
                        <ol>${sData.referenceBooks.map(rb => `<li>${formatBookCitation(rb)}</li>`).join("")}</ol>
                    ` : ""}

                    ${parsedResources.length ? `
                        <div class="syllabus-heading">Online Resources & Reference Links</div>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px;">
                            <thead>
                                <tr style="background: #f1f5f9; text-align: left;">
                                    <th style="border: 1px solid #333; padding: 4px 6px; width: 35px; text-align: center;">#</th>
                                    <th style="border: 1px solid #333; padding: 4px 6px; width: 120px;">Platform</th>
                                    <th style="border: 1px solid #333; padding: 4px 6px;">Topic</th>
                                    <th style="border: 1px solid #333; padding: 4px 6px;">Resource Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${parsedResources.map((res, idx) => `
                                    <tr>
                                        <td style="border: 1px solid #333; padding: 4px 6px; text-align: center; font-weight: bold;">${idx + 1}</td>
                                        <td style="border: 1px solid #333; padding: 4px 6px; font-weight: 600; color: #0d6efd;">${res.platform || "Online"}</td>
                                        <td style="border: 1px solid #333; padding: 4px 6px;">${res.topic || "-"}</td>
                                        <td style="border: 1px solid #333; padding: 4px 6px;">
                                            <a href="${res.url.startsWith("http") ? res.url : `https://${res.url}`}">${res.url}</a>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    ` : ""}
                </div>
                `;
            }).join("");

            const electiveSyllabiHtml = semElectives.map((grp) => {
                const subs = subjectsMap[grp.id] || [];
                return subs.map((sub) => {
                    const code = String(sub.courseCode || "").trim().toUpperCase();
                    if (!code || printedSyllabusCodes.has(code)) return "";
                    const sData = syllabusDetailMap[sub.syllabusId];
                    if (!sData) return "";

                    printedSyllabusCodes.add(code);

                    const L = Number(sub.lecture) || 0;
                    const R = Number(sub.tutorial) || 0;
                    const P = Number(sub.practical) || 0;
                    const C = Number(sub.credits) || 0;

                    const parsedResources = (sData.onlineResources || [])
                        .map(parseResource)
                        .filter(Boolean);

                    return `
                    <div class="syllabus-box">
                        <div style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">
                            ${normalizeGroupTitle(grp.name, grp.electiveType)}
                        </div>
                        <table class="syllabus-meta-table">
                            <tr>
                                <td colspan="3" style="font-weight: bold; font-size: 10.5pt;">
                                    <div style="color: #0d6efd;">${sub.courseCode || ""}</div>
                                    <div>${sub.courseName || ""}</div>
                                </td>
                                <td style="width: 35px; text-align: center; font-weight: bold;">L</td>
                                <td style="width: 35px; text-align: center; font-weight: bold;">R</td>
                                <td style="width: 35px; text-align: center; font-weight: bold;">P</td>
                                <td style="width: 35px; text-align: center; font-weight: bold;">C</td>
                            </tr>
                            <tr>
                                <td colspan="3" style="font-size: 8.5pt; color: #475569;">Credit Structure</td>
                                <td style="text-align: center; font-weight: bold;">${L}</td>
                                <td style="text-align: center; font-weight: bold;">${R}</td>
                                <td style="text-align: center; font-weight: bold;">${P}</td>
                                <td style="text-align: center; font-weight: bold;">${C}</td>
                            </tr>
                            <tr>
                                <td style="width: 110px; font-weight: bold; background: #f8fafc;">Course type</td>
                                <td>${sData.courseType || "Elective"}</td>
                                <td style="width: 110px; font-weight: bold; background: #f8fafc;">Pre-requisite</td>
                                <td colspan="4">${sData.prerequisite || "NA"}</td>
                            </tr>
                        </table>

                        <div class="syllabus-heading">Course Outcomes:</div>
                        <ul style="list-style-type: none; padding-left: 0;">
                            ${(sData.courseOutcomes || []).map((co, i) => `<li><strong>CO${i + 1}:</strong> ${co}</li>`).join("")}
                        </ul>

                        ${renderUnitsHtml(sData.units, L)}

                        ${R > 0 && sData.recitations?.length ? `
                            <div class="syllabus-heading">Recitation / Tutorial Topics</div>
                            <ol>${sData.recitations.map(r => `<li>${r}</li>`).join("")}</ol>
                        ` : ""}

                        ${P > 0 && sData.labComponents?.length ? `
                            <div class="syllabus-heading">Lab / Product Components</div>
                            <ol>${sData.labComponents.map(l => `<li>${l}</li>`).join("")}</ol>
                        ` : ""}

                        ${sData.textbooks?.length ? `
                            <div class="syllabus-heading">Textbooks</div>
                            <ol>${sData.textbooks.map(tb => `<li>${formatBookCitation(tb)}</li>`).join("")}</ol>
                        ` : ""}

                        ${sData.referenceBooks?.length ? `
                            <div class="syllabus-heading">Reference Books</div>
                            <ol>${sData.referenceBooks.map(rb => `<li>${formatBookCitation(rb)}</li>`).join("")}</ol>
                        ` : ""}

                        ${parsedResources.length ? `
                            <div class="syllabus-heading">Online Resources & Reference Links</div>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="border: 1px solid #333; padding: 4px 6px; width: 35px; text-align: center;">#</th>
                                        <th style="border: 1px solid #333; padding: 4px 6px; width: 120px;">Platform</th>
                                        <th style="border: 1px solid #333; padding: 4px 6px;">Topic</th>
                                        <th style="border: 1px solid #333; padding: 4px 6px;">Resource Link</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${parsedResources.map((res, idx) => `
                                        <tr>
                                            <td style="border: 1px solid #333; padding: 4px 6px; text-align: center; font-weight: bold;">${idx + 1}</td>
                                            <td style="border: 1px solid #333; padding: 4px 6px; font-weight: 600; color: #0d6efd;">${res.platform || "Online"}</td>
                                            <td style="border: 1px solid #333; padding: 4px 6px;">${res.topic || "-"}</td>
                                            <td style="border: 1px solid #333; padding: 4px 6px;">
                                                <a href="${res.url.startsWith("http") ? res.url : `https://${res.url}`}">${res.url}</a>
                                            </td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        ` : ""}
                    </div>
                    `;
                }).join("");
            }).join("");

            return courseSyllabiHtml + electiveSyllabiHtml;
        }).join("")}
    </body>
    </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
    };
}