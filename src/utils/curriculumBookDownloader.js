import api from "../services/api";

export async function downloadCompleteCurriculumBook({
    regulationCode,
    departmentCode,
    programCode,
    programName,
    curricula = [],
    subjectsMap = {},
}) {
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

    const getStatusText = (status) => {
        const s = String(status || "").toUpperCase();
        if (s === "APPROVED") return "Approved";
        if (s === "UPLOADED") return "Uploaded";
        if (s === "DRAFT") return "Draft";
        if (s === "REJECTED") return "Rejected";
        return "Not Uploaded";
    };

    const getStatusColor = (status) => {
        const s = String(status || "").toUpperCase();
        if (s === "APPROVED") return "#198754";
        if (s === "UPLOADED") return "#0d6efd";
        if (s === "DRAFT") return "#d97706";
        if (s === "REJECTED") return "#dc3545";
        return "#6c757d";
    };

    // Separates main courses from alternative ("OR") courses without merging
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

    // 3. Build HTML Output
    const printWindow = window.open("", "_blank", "width=1000,height=900");
    if (!printWindow) {
        alert("Please allow popups to download the complete Curriculum Book");
        return;
    }

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
            /* Explicit page break ONLY for Syllabi sections */
            // .syllabus-page-break {
            //     page-break-before: always;
            // }
            .cover-page {
                text-align: center;
                padding: 70px 20px 40px 20px;
                border-bottom: 2px solid #0d6efd;
                margin-bottom: 25px;
            }
            .cover-title {
                font-size: 22pt;
                font-weight: 800;
                color: #0d6efd;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .cover-subtitle {
                font-size: 14pt;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 15px;
            }
            .cover-meta {
                font-size: 10pt;
                color: #475569;
                display: flex;
                justify-content: center;
                gap: 25px;
            }
            .semester-block {
                margin-bottom: 22px;
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
                margin-bottom: 10px;
                font-size: 8.8pt;
            }
            table.curriculum-table th, table.curriculum-table td {
                border: 1px solid #333;
                padding: 4px 6px;
                text-align: center;
            }
            table.curriculum-table th {
                background-color: #f1f5f9;
                font-weight: 600;
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
            .badge-status {
                font-weight: 700;
                font-size: 7.5pt;
                padding: 2px 5px;
                border-radius: 3px;
                color: white;
                display: inline-block;
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
            <div style="font-size: 13pt; font-weight: bold; color: #64748b; margin-bottom: 4px;">SR UNIVERSITY</div>
            <div class="cover-title">Curriculum & Course Structure</div>
            <div class="cover-subtitle">${programName || programCode}</div>
            <div class="cover-meta">
                <div><strong>Regulation:</strong> ${regulationCode}</div>
                <div><strong>Department:</strong> ${departmentCode}</div>
                <div><strong>Academic Level:</strong> ${programName?.includes("M.") ? "PG" : "UG"}</div>
            </div>
        </div>

        <!-- 1. CONTINUOUS SEMESTER-WISE TABLES (NO FORCED PAGE BREAK BETWEEN SEMESTERS) -->
        ${curricula.map((sem) => {
        const { hasAltTrack, track1Courses, track1Electives, track2Courses } = getSemesterTracks(sem);
        if (track1Courses.length === 0 && track1Electives.length === 0 && track2Courses.length === 0) return "";

        let t1L = 0, t1R = 0, t1P = 0, t1C = 0;
        let t2L = 0, t2R = 0, t2P = 0, t2C = 0;

        return `
            <div class="semester-block">
                <div class="section-header">
                    Semester ${sem.semester} Course Structure - ${regulationCode} (${departmentCode})
                </div>
                <table class="curriculum-table">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width: 35px;">S.No</th>
                            <th rowspan="2" style="width: 115px;">Course Code</th>
                            <th rowspan="2" style="text-align: left; padding-left: 8px;">Course Title</th>
                            <th colspan="4">Hours / Week</th>
                            <th rowspan="2" style="width: 90px;">Syllabus Status</th>
                        </tr>
                        <tr>
                            <th style="width: 32px;">L</th>
                            <th style="width: 32px;">R</th>
                            <th style="width: 32px;">P</th>
                            <th style="width: 36px;">C</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- TRACK 1: MAIN COURSES -->
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
                                <td>
                                    <span class="badge-status" style="background-color: ${getStatusColor(c.syllabusStatus)};">
                                        ${getStatusText(c.syllabusStatus)}
                                    </span>
                                </td>
                            </tr>
                            `;
        }).join("")}

                        <!-- TRACK 1: ELECTIVE SLOTS -->
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
                                <td><span style="font-size: 7.5pt; color: #64748b;">Elective</span></td>
                            </tr>
                            `;
        }).join("")}

                        <!-- TRACK 1 TOTAL -->
                        <tr style="background: #f1f5f9; font-weight: bold;">
                            <td colspan="3" style="text-align: right; padding-right: 10px;">${hasAltTrack ? "Total (Option 1)" : "Total"}</td>
                            <td>${formatNum(t1L)}</td>
                            <td>${formatNum(t1R)}</td>
                            <td>${formatNum(t1P)}</td>
                            <td>${formatNum(t1C)}</td>
                            <td></td>
                        </tr>

                        <!-- SEPARATE ALTERNATIVE TRACK ("OR") WITHOUT MERGING -->
                        ${hasAltTrack ? `
                            <tr>
                                <td colspan="8" class="or-divider">--- OR ---</td>
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
                                    <td>
                                        <span class="badge-status" style="background-color: ${getStatusColor(c.syllabusStatus)};">
                                            ${getStatusText(c.syllabusStatus)}
                                        </span>
                                    </td>
                                </tr>
                                `;
        }).join("")}

                            <tr style="background: #f1f5f9; font-weight: bold;">
                                <td colspan="3" style="text-align: right; padding-right: 10px;">Total (Option 2)</td>
                                <td>${formatNum(t2L)}</td>
                                <td>${formatNum(t2R)}</td>
                                <td>${formatNum(t2P)}</td>
                                <td>${formatNum(t2C)}</td>
                                <td></td>
                            </tr>
                        ` : ""}
                    </tbody>
                </table>
            </div>
            `;
    }).join("")}

        <!-- 2. ELECTIVES INDEX & POOLS DETAIL TABLE -->
        <div class="semester-block" style="margin-top: 25px;">
            <div class="section-header">Elective Groups & Buckets (All Semesters)</div>
            ${curricula.map((sem) => {
        const groups = sem.electiveGroups || [];
        if (groups.length === 0) return "";

        return groups.map((grp) => {
            const subs = subjectsMap[grp.id] || [];
            return `
                    <div style="margin-bottom: 16px;">
                        <div style="font-weight: bold; font-size: 9.5pt; color: #1e293b; margin-bottom: 4px;">
                            Semester ${sem.semester}: ${grp.name} (${grp.electiveType || "Elective"})
                        </div>
                        <table class="curriculum-table">
                            <thead>
                                <tr>
                                    <th style="width: 35px;">#</th>
                                    <th style="width: 115px;">Subject Code</th>
                                    <th style="text-align: left; padding-left: 8px;">Subject Title</th>
                                    <th style="width: 45px;">Dept</th>
                                    <th style="width: 32px;">L</th>
                                    <th style="width: 32px;">R</th>
                                    <th style="width: 32px;">P</th>
                                    <th style="width: 36px;">C</th>
                                    <th style="width: 90px;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${subs.length === 0 ? `<tr><td colspan="9" style="color: #94a3b8;">No subjects in this group</td></tr>` :
                    subs.map((s, idx) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td style="font-weight: bold;">${s.courseCode || "-"}</td>
                                    <td style="text-align: left; padding-left: 8px;">${s.courseName}</td>
                                    <td>${s.offeringDepartment || "-"}</td>
                                    <td>${formatNum(s.lecture)}</td>
                                    <td>${formatNum(s.tutorial)}</td>
                                    <td>${formatNum(s.practical)}</td>
                                    <td style="font-weight: bold;">${formatNum(getCredit(s))}</td>
                                    <td>
                                        <span class="badge-status" style="background-color: ${getStatusColor(s.syllabusStatus)};">
                                            ${getStatusText(s.syllabusStatus)}
                                        </span>
                                    </td>
                                </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                    `;
        }).join("");
    }).join("")}
        </div>

        <!-- 3. INDIVIDUAL COURSE SYLLABI (PAGE BREAK STARTS HERE ONLY FOR SYLLABI) -->
        <div class="syllabus-page-break"></div>
        <div class="section-header" style="margin-bottom: 18px;">
            Detailed Syllabi (Semester 1 Onwards)
        </div>

        ${curricula.map((sem) => {
        const semCourses = sem.courses || [];
        const semElectives = sem.electiveGroups || [];

        const courseSyllabiHtml = semCourses.map((course) => {
            const sData = syllabusDetailMap[course.syllabusId];
            if (!sData) return "";

            const L = Number(course.lecture) || 0;
            const R = Number(course.tutorial) || 0;
            const P = Number(course.practical) || 0;
            const C = Number(course.credits) || 0;

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

                    ${L > 0 && sData.units ? `
                        <div class="syllabus-heading">Unit-Wise Syllabus (Theory - ${L * 12} Topics)</div>
                        ${sData.units.map(u => `
                            <div style="margin-bottom: 6px;">
                                <strong>${u.title}</strong>
                                <ul style="margin: 0; padding-left: 16px;">
                                    ${(u.topics || []).map(t => `<li>${t}</li>`).join("")}
                                </ul>
                            </div>
                        `).join("")}
                    ` : ""}

                    ${R > 0 && sData.recitations?.length ? `
                        <div class="syllabus-heading">Recitation / Tutorial Topics (${R * 12} Topics)</div>
                        <ol>${sData.recitations.map(r => `<li>${r}</li>`).join("")}</ol>
                    ` : ""}

                    ${P > 0 && sData.labComponents?.length ? `
                        <div class="syllabus-heading">Lab / Product Components (${Math.round((P / 2) * 12)} Activities)</div>
                        <ol>${sData.labComponents.map(l => `<li>${l}</li>`).join("")}</ol>
                    ` : ""}

                    ${sData.textbooks?.length ? `
                        <div class="syllabus-heading">Textbooks</div>
                        <ol>${sData.textbooks.map(tb => `<li>${tb}</li>`).join("")}</ol>
                    ` : ""}

                    ${sData.referenceBooks?.length ? `
                        <div class="syllabus-heading">Reference Books</div>
                        <ol>${sData.referenceBooks.map(rb => `<li>${rb}</li>`).join("")}</ol>
                    ` : ""}

                    ${sData.onlineResources?.length ? `
                        <div class="syllabus-heading">Online Resources</div>
                        <ul>${sData.onlineResources.map(res => `<li><a href="${res.startsWith("http") ? res : `https://${res}`}">${res}</a></li>`).join("")}</ul>
                    ` : ""}
                </div>
                `;
        }).join("");

        const electiveSyllabiHtml = semElectives.map((grp) => {
            const subs = subjectsMap[grp.id] || [];
            return subs.map((sub) => {
                const sData = syllabusDetailMap[sub.syllabusId];
                if (!sData) return "";

                const L = Number(sub.lecture) || 0;
                const R = Number(sub.tutorial) || 0;
                const P = Number(sub.practical) || 0;
                const C = Number(sub.credits) || 0;

                return `
                    <div class="syllabus-box">
                        <div style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">
                            Semester ${sem.semester} •${grp.name} Elective
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
                                <td>${sData.courseType || "Professional Elective"}</td>
                                <td style="width: 110px; font-weight: bold; background: #f8fafc;">Pre-requisite</td>
                                <td colspan="4">${sData.prerequisite || "NA"}</td>
                            </tr>
                        </table>

                        <div class="syllabus-heading">Course Outcomes:</div>
                        <ul style="list-style-type: none; padding-left: 0;">
                            ${(sData.courseOutcomes || []).map((co, i) => `<li><strong>CO${i + 1}:</strong> ${co}</li>`).join("")}
                        </ul>

                        ${L > 0 && sData.units ? `
                            <div class="syllabus-heading">Unit-Wise Syllabus (Theory)</div>
                            ${sData.units.map(u => `
                                <div style="margin-bottom: 6px;">
                                    <strong>${u.title}</strong>
                                    <ul style="margin: 0; padding-left: 16px;">
                                        ${(u.topics || []).map(t => `<li>${t}</li>`).join("")}
                                    </ul>
                                </div>
                            `).join("")}
                        ` : ""}

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
                            <ol>${sData.textbooks.map(tb => `<li>${tb}</li>`).join("")}</ol>
                        ` : ""}

                        ${sData.referenceBooks?.length ? `
                            <div class="syllabus-heading">Reference Books</div>
                            <ol>${sData.referenceBooks.map(rb => `<li>${rb}</li>`).join("")}</ol>
                        ` : ""}

                        ${sData.onlineResources?.length ? `
                            <div class="syllabus-heading">Online Resources</div>
                            <ul>${sData.onlineResources.map(res => `<li><a href="${res.startsWith("http") ? res : `https://${res}`}">${res}</a></li>`).join("")}</ul>
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