import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import AdminLayout from "../../layouts/AdminLayout";
import { getAllRegulations } from "../../services/regulationService";
import { getAllDepartments } from "../../services/departmentService";
import { getAllPrograms } from "../../services/programService";
import {
    getSemesterCurriculum,
    getElectiveSubjects,
    getCourseSyllabusStatus,
    getElectiveSubjectSyllabusStatus,
} from "../../services/curriculumService";
import TextSyllabusModal from "../../components/TextSyllabusModal";
import SyllabusAuditLogModal from "../../components/SyllabusAuditLogModal";

function Curriculum() {
    const [regulations, setRegulations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]);

    const [regulationCode, setRegulationCode] = useState("");
    const [departmentCode, setDepartmentCode] = useState("");
    const [programCode, setProgramCode] = useState("");
    const [semester, setSemester] = useState("");

    const [curricula, setCurricula] = useState([]);
    const [subjects, setSubjects] = useState({});
    const [expandedGroups, setExpandedGroups] = useState({});
    const [initialLoading, setInitialLoading] = useState(true);
    const [curriculumLoading, setCurriculumLoading] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState({});

    // Syllabus Modal State
    const [textModal, setTextModal] = useState({
        open: false,
        item: null,
        type: "course",
        readOnly: false,
    });

    // Audit Log Modal State
    const [logModal, setLogModal] = useState({
        open: false,
        syllabusId: null,
        title: "",
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setInitialLoading(true);
                const [regulationResponse, departmentResponse, programResponse] =
                    await Promise.all([
                        getAllRegulations(),
                        getAllDepartments(),
                        getAllPrograms().catch(() => ({ data: [] })),
                    ]);
                setRegulations(regulationResponse?.data || []);
                setDepartments(departmentResponse?.data || []);
                setAllPrograms(programResponse?.data || []);
            } catch (error) {
                toast.error("Failed to load initial configuration data");
            } finally {
                setInitialLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const selectedRegulation = useMemo(
        () => regulations.find((r) => r.code === regulationCode),
        [regulations, regulationCode]
    );

    const availablePrograms = useMemo(() => {
        if (!departmentCode) return [];
        const normDept = departmentCode.trim().toUpperCase();
        const regLevel = selectedRegulation?.level?.toUpperCase();

        return allPrograms.filter((p) => {
            const matchesDept = (p.departmentCode || "").toUpperCase() === normDept;
            const matchesLevel = regLevel ? (p.level || "").toUpperCase() === regLevel : true;
            return matchesDept && matchesLevel;
        });
    }, [departmentCode, selectedRegulation, allPrograms]);

    const selectedProgram = useMemo(
        () => allPrograms.find((p) => p.code === programCode),
        [allPrograms, programCode]
    );

    const maxSemesters = selectedProgram?.totalSemesters || 8;

    const semesterOptions = useMemo(() => {
        const list = [{ value: "ALL", label: "All Semesters" }];
        const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
        for (let i = 1; i <= maxSemesters; i++) {
            list.push({
                value: String(i),
                label: `Semester ${roman[i - 1] || i}`,
            });
        }
        return list;
    }, [maxSemesters]);

    const programHeader = useMemo(() => {
        if (!regulationCode && !departmentCode) return "";
        const progName = selectedProgram?.name ? `(${selectedProgram.name})` : "";
        return `${regulationCode} - ${departmentCode} ${progName}`.trim();
    }, [regulationCode, departmentCode, selectedProgram]);

    const clearCurriculum = () => {
        setCurricula([]);
        setSubjects({});
        setSubjectsLoading({});
        setExpandedGroups({});
    };

    const handleRegulationChange = (event) => {
        setRegulationCode(event.target.value);
        setProgramCode("");
        setSemester("");
        clearCurriculum();
    };

    const handleDepartmentChange = (event) => {
        setDepartmentCode(event.target.value);
        setProgramCode("");
        setSemester("");
        clearCurriculum();
    };

    const handleProgramChange = (event) => {
        setProgramCode(event.target.value);
        setSemester("");
        clearCurriculum();
    };

    const handleSemesterChange = (event) => {
        setSemester(event.target.value);
        clearCurriculum();
    };

    const normalizeCurriculumResponse = (response, semesterNumber) => {
        const data = response?.data || response || {};
        return {
            semester: semesterNumber,
            courses: data?.courses || [],
            electiveGroups: data?.electiveGroups || data?.electives || [],
        };
    };

    const attachCourseSyllabusStatus = async (courses = []) => {
        return Promise.all(
            courses.map(async (course) => {
                try {
                    const response = await getCourseSyllabusStatus(course.id);
                    const data = response?.data || response || {};
                    const syllabus = data?.syllabus || data?.syllabusDetails || null;
                    return {
                        ...course,
                        syllabusId: data?.syllabusId || syllabus?.id || course?.syllabusId || null,
                        syllabusStatus: data?.syllabusStatus || data?.status || syllabus?.status || "NOT_UPLOADED",
                        rejectionReason: data?.rejectionReason || syllabus?.rejectionReason || null,
                        syllabus: syllabus || course?.syllabus || null,
                    };
                } catch (error) {
                    return { ...course, syllabusStatus: "NOT_UPLOADED" };
                }
            })
        );
    };

    const attachElectiveSyllabusStatus = async (subjectsList = []) => {
        return Promise.all(
            subjectsList.map(async (subject) => {
                try {
                    const response = await getElectiveSubjectSyllabusStatus(subject.id);
                    const data = response?.data || response || {};
                    const syllabus = data?.syllabus || data?.syllabusDetails || null;
                    return {
                        ...subject,
                        syllabusId: data?.syllabusId || syllabus?.id || subject?.syllabusId || null,
                        syllabusStatus: data?.syllabusStatus || data?.status || syllabus?.status || "NOT_UPLOADED",
                        rejectionReason: data?.rejectionReason || syllabus?.rejectionReason || null,
                        syllabus: syllabus || subject?.syllabus || null,
                        offeringDepartment: subject?.offeringDepartment || data?.offeringDepartment || null,
                    };
                } catch (error) {
                    return { ...subject, syllabusStatus: "NOT_UPLOADED" };
                }
            })
        );
    };

    const loadElectiveSubjects = async (groups) => {
        const subjectMap = {};
        for (const group of groups) {
            try {
                setSubjectsLoading((prev) => ({ ...prev, [group.id]: true }));
                const response = await getElectiveSubjects(group.id);
                const data = response?.data || response?.subjects || response || [];
                const subjectList = Array.isArray(data) ? data : [];
                subjectMap[group.id] = await attachElectiveSyllabusStatus(subjectList);
            } catch (error) {
                subjectMap[group.id] = [];
            } finally {
                setSubjectsLoading((prev) => ({ ...prev, [group.id]: false }));
            }
        }
        setSubjects((prev) => ({ ...prev, ...subjectMap }));
    };

    const handleLoadCurriculum = async () => {
        if (!regulationCode) {
            toast.error("Please select a regulation");
            return;
        }
        if (!departmentCode) {
            toast.error("Please select a department");
            return;
        }
        if (!programCode) {
            toast.error("Please select a degree programme");
            return;
        }
        if (!semester) {
            toast.error("Please select a semester");
            return;
        }

        try {
            setCurriculumLoading(true);
            clearCurriculum();

            if (semester === "ALL") {
                const semesterNumbers = Array.from({ length: maxSemesters }, (_, i) => i + 1);
                const responses = await Promise.all(
                    semesterNumbers.map(async (sem) => {
                        try {
                            const response = await getSemesterCurriculum(
                                regulationCode,
                                departmentCode,
                                sem,
                                programCode
                            );
                            const normalized = normalizeCurriculumResponse(response, sem);
                            normalized.courses = await attachCourseSyllabusStatus(normalized.courses);
                            return normalized;
                        } catch (error) {
                            return { semester: sem, courses: [], electiveGroups: [] };
                        }
                    })
                );
                setCurricula(responses);
                const allGroups = responses.flatMap((item) => item.electiveGroups || []);
                await loadElectiveSubjects(allGroups);
                return;
            }

            const sem = Number(semester);
            const response = await getSemesterCurriculum(
                regulationCode,
                departmentCode,
                sem,
                programCode
            );
            const singleCurriculum = normalizeCurriculumResponse(response, sem);
            singleCurriculum.courses = await attachCourseSyllabusStatus(singleCurriculum.courses);
            setCurricula([singleCurriculum]);
            const groups = singleCurriculum.electiveGroups || [];
            await loadElectiveSubjects(groups);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load curriculum");
            clearCurriculum();
        } finally {
            setCurriculumLoading(false);
        }
    };

    const handleToggleElectiveGroup = async (group) => {
        const groupId = group.id;
        setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

        if (subjects[groupId] && subjects[groupId].length > 0) return;

        try {
            setSubjectsLoading((prev) => ({ ...prev, [groupId]: true }));
            const response = await getElectiveSubjects(groupId);
            const data = response?.data || response?.subjects || response || [];
            const subjectList = Array.isArray(data) ? data : [];
            const subjectsWithStatus = await attachElectiveSyllabusStatus(subjectList);
            setSubjects((prev) => ({ ...prev, [groupId]: subjectsWithStatus }));
        } catch (error) {
            toast.error("Failed to load elective subjects");
        } finally {
            setSubjectsLoading((prev) => ({ ...prev, [groupId]: false }));
        }
    };

    const isExcludedCourse = (course) => {
        const code = String(course?.courseCode || "").trim().toUpperCase();
        return code.includes("HN") || code.includes("MN");
    };

    const formatNumber = (value) => {
        const number = Number(value) || 0;
        return Number.isInteger(number) ? number : Number(number.toFixed(2));
    };

    const getCredit = (item) => {
        const stored = Number(item?.credits);
        if (Number.isFinite(stored) && stored > 0) return stored;
        const lecture = Number(item?.lecture) || 0;
        const tutorial = Number(item?.tutorial) || 0;
        const practical = Number(item?.practical) || 0;
        if (lecture === 0 && tutorial === 0 && practical === 0) return 0;
        return lecture + 0.5 * tutorial + 0.5 * practical;
    };

    const getSemesterTitle = (semesterNumber) => {
        const titles = {
            1: "I SEM",
            2: "II SEM",
            3: "III SEM",
            4: "IV SEM",
            5: "V SEM",
            6: "VI SEM",
            7: "VII SEM",
            8: "VIII SEM",
        };
        return titles[semesterNumber] || `Semester ${semesterNumber}`;
    };

    const getSemesterTracks = (curriculum) => {
        const semNum = Number(curriculum.semester);
        const courses = (curriculum.courses || []).filter((c) => !isExcludedCourse(c));
        const electives = curriculum.electiveGroups || [];

        const isAltCourse = (c) => {
            if (c.isAlternative === true || Boolean(c.isAlternative)) return true;

            const name = (c.courseName || "").toLowerCase();
            const isCapstone = name.includes("capstone");
            if (isCapstone) return false;

            const credits = Number(c.credits) || 0;
            const isIndustrial = name.includes("industrial project") || name.includes("internship");

            if ((semNum === 3 || semNum === 7) && (isIndustrial || credits >= 15)) {
                return true;
            }

            return false;
        };

        const altCourses = courses.filter(isAltCourse);
        const mainCourses = courses.filter((c) => !isAltCourse(c));

        const track1Items = [
            ...mainCourses.map((c) => ({ type: "course", data: c })),
            ...electives.map((g) => ({ type: "elective", data: g })),
        ];

        const track2Items = altCourses.map((c) => ({ type: "course", data: c }));

        return {
            hasAltTrack: track2Items.length > 0,
            track1Items,
            track2Items,
        };
    };

    const getSyllabusStatus = (item) => {
        return String(item?.syllabusStatus || item?.status || "NOT_UPLOADED").toUpperCase();
    };

    const getStatusBadgeClass = (status) => {
        const s = String(status || "").trim().toUpperCase();
        if (s === "APPROVED") return "bg-success-subtle text-success";
        if (s === "REJECTED") return "bg-danger-subtle text-danger";
        if (s === "UPLOADED") return "bg-primary-subtle text-primary";
        if (s === "DRAFT") return "bg-warning-subtle text-warning-emphasis";
        return "bg-secondary-subtle text-secondary";
    };

    const getStatusLabel = (status) => {
        const s = String(status || "").trim().toUpperCase();
        if (s === "NOT_UPLOADED" || s === "AWAITING_SYLLABUS") return "Not Uploaded";
        if (s === "DRAFT") return "Draft";
        if (s === "UPLOADED") return "Uploaded";
        if (s === "APPROVED") return "Approved";
        if (s === "REJECTED") return "Rejected";
        return s;
    };

    // Compact Action Buttons
    const renderActionButtons = (item, type) => {
        const status = getSyllabusStatus(item);
        const isUploaded = status === "UPLOADED" || status === "APPROVED" || status === "DRAFT";
        const hasViewableContent = status === "UPLOADED" || status === "APPROVED" || status === "REJECTED";

        return (
            <div className="d-flex justify-content-center align-items-center gap-1 text-nowrap">
                {/* Upload Button */}
                <button
                    type="button"
                    className="btn btn-sm btn-primary py-0 px-1.5"
                    style={{ fontSize: "0.78rem", minWidth: "56px" }}
                    onClick={() => setTextModal({ open: true, item, type, readOnly: false })}
                >
                    <i className="bi bi-pencil-square me-1"></i>
                    {isUploaded ? "Edit" : "Upload"}
                </button>

                {/* View Button */}
                <button
                    type="button"
                    className="btn btn-sm btn-outline-primary py-0 px-1.5"
                    style={{ fontSize: "0.78rem", minWidth: "50px" }}
                    onClick={() => setTextModal({ open: true, item, type, readOnly: true })}
                    disabled={!hasViewableContent}
                    title={hasViewableContent ? "View Syllabus" : "Syllabus not uploaded"}
                >
                    <i className="bi bi-eye me-1"></i>
                    View
                </button>

                {/* Logs Button */}
                <button
                    type="button"
                    className="btn btn-sm btn-outline-dark py-0 px-1.5"
                    style={{ fontSize: "0.78rem", minWidth: "50px" }}
                    onClick={() => setLogModal({
                        open: true,
                        syllabusId: item.syllabusId,
                        title: `${item.courseCode || ""} - ${item.courseName || ""}`,
                    })}
                    disabled={!item.syllabusId}
                    title={item.syllabusId ? "View Audit & Revision Logs" : "No logs available"}
                >
                    <i className="bi bi-clock-history me-1"></i>
                    Logs
                </button>
            </div>
        );
    };

    if (initialLoading) {
        return (
            <AdminLayout>
                <div className="card border-0 shadow-sm text-center py-5">
                    <div className="spinner-border text-primary"></div>
                    <p className="text-muted mt-3 mb-0">Loading portal...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-3">
                <h3 className="fw-bold mb-1">Curriculum Management</h3>
                <p className="text-muted small mb-0">
                    Inspect curriculum structure and view, edit, or track text-based syllabus records.
                </p>
            </div>

            {/* FILTER CARD */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-3">
                    <div className="row g-2 align-items-end">
                        <div className="col-12 col-md-3">
                            <label className="form-label fw-semibold small mb-1">Regulation *</label>
                            <select className="form-select form-select-sm" value={regulationCode} onChange={handleRegulationChange}>
                                <option value="">Select Regulation</option>
                                {regulations.map((reg) => (
                                    <option key={reg.code} value={reg.code}>
                                        {reg.code} {reg.level ? `(${reg.level})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 col-md-3">
                            <label className="form-label fw-semibold small mb-1">Department *</label>
                            <select className="form-select form-select-sm" value={departmentCode} onChange={handleDepartmentChange}>
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept.code} value={dept.code}>
                                        {dept.name} ({dept.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 col-md-3">
                            <label className="form-label fw-semibold small mb-1">Degree Programme *</label>
                            <select
                                className="form-select form-select-sm"
                                value={programCode}
                                onChange={handleProgramChange}
                                disabled={!departmentCode || !regulationCode}
                            >
                                <option value="">
                                    {!departmentCode || !regulationCode
                                        ? "Select Regulation & Dept First"
                                        : availablePrograms.length === 0
                                        ? "No matching programmes"
                                        : "Select Degree Programme"}
                                </option>
                                {availablePrograms.map((prog) => (
                                    <option key={prog.code} value={prog.code}>
                                        {prog.name} ({prog.totalSemesters} Semesters)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 col-md-2">
                            <label className="form-label fw-semibold small mb-1">Semester *</label>
                            <select className="form-select form-select-sm" value={semester} onChange={handleSemesterChange} disabled={!programCode}>
                                <option value="">Select Semester</option>
                                {semesterOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 col-md-1">
                            <button
                                type="button"
                                className="btn btn-sm btn-primary w-100"
                                onClick={handleLoadCurriculum}
                                disabled={curriculumLoading || !programCode || !semester}
                            >
                                {curriculumLoading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-search"></i>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CURRICULUM TABLES */}
            {curricula.length > 0 && (
                <div>
                    {curricula.map((curriculum) => {
                        const { hasAltTrack, track1Items, track2Items } = getSemesterTracks(curriculum);

                        if (track1Items.length === 0 && track2Items.length === 0) return null;

                        const track1Lecture = track1Items.reduce((s, x) => s + (Number(x.data.lecture) || 0), 0);
                        const track1Tutorial = track1Items.reduce((s, x) => s + (Number(x.data.tutorial) || 0), 0);
                        const track1Practical = track1Items.reduce((s, x) => s + (Number(x.data.practical) || 0), 0);
                        const track1Credits = track1Items.reduce((s, x) => s + getCredit(x.data), 0);

                        const track2Lecture = track2Items.reduce((s, x) => s + (Number(x.data.lecture) || 0), 0);
                        const track2Tutorial = track2Items.reduce((s, x) => s + (Number(x.data.tutorial) || 0), 0);
                        const track2Practical = track2Items.reduce((s, x) => s + (Number(x.data.practical) || 0), 0);
                        const track2Credits = track2Items.reduce((s, x) => s + getCredit(x.data), 0);

                        return (
                            <div key={curriculum.semester} className="card border-0 shadow-sm mb-4">
                                <div className="card-header bg-primary text-white py-2 px-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h6 className="fw-bold mb-0">{getSemesterTitle(curriculum.semester)}</h6>
                                        <small className="opacity-75">{programHeader}</small>
                                    </div>
                                </div>

                                <div className="table-responsive" style={{ overflowX: "hidden" }}>
                                    <table
                                        className="table table-sm table-bordered align-middle mb-0 text-center"
                                        style={{ width: "100%", fontSize: "0.85rem", tableLayout: "auto" }}
                                    >
                                        <colgroup>
                                            <col style={{ width: "45px" }} />
                                            <col style={{ width: "130px" }} />
                                            <col />
                                            <col style={{ width: "38px" }} />
                                            <col style={{ width: "38px" }} />
                                            <col style={{ width: "38px" }} />
                                            <col style={{ width: "42px" }} />
                                            <col style={{ width: "110px" }} />
                                            <col style={{ width: "175px" }} />
                                        </colgroup>
                                        <thead className="table-primary text-dark fw-semibold">
                                            <tr>
                                                <th rowSpan="2" className="py-1">S.No.</th>
                                                <th rowSpan="2" className="py-1">Course Code</th>
                                                <th rowSpan="2" className="text-start ps-2 py-1">Course</th>
                                                <th colSpan="4" className="py-0.5">Hours / Week</th>
                                                <th rowSpan="2" className="py-1">Status</th>
                                                <th rowSpan="2" className="py-1">Action</th>
                                            </tr>
                                            <tr>
                                                <th className="py-0.5">L</th>
                                                <th className="py-0.5">R</th>
                                                <th className="py-0.5">P</th>
                                                <th className="py-0.5">C</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* TRACK 1 */}
                                            {track1Items.map((entry, idx) => {
                                                const serial = idx + 1;

                                                if (entry.type === "course") {
                                                    const course = entry.data;
                                                    return (
                                                        <tr key={`t1-course-${course.id}`} style={{ height: "42px" }}>
                                                            <td className="py-1">{serial}</td>
                                                            <td className="fw-semibold text-truncate py-1" title={course.courseCode}>
                                                                {course.courseCode || "-"}
                                                            </td>
                                                            <td className="text-start ps-2 fw-semibold text-truncate py-1" title={course.courseName}>
                                                                {course.courseName}
                                                            </td>
                                                            <td className="py-1">{formatNumber(course.lecture)}</td>
                                                            <td className="py-1">{formatNumber(course.tutorial)}</td>
                                                            <td className="py-1">{formatNumber(course.practical)}</td>
                                                            <td className="fw-semibold py-1">{formatNumber(getCredit(course))}</td>
                                                            <td className="py-1">
                                                                <span
                                                                    className={`badge ${getStatusBadgeClass(getSyllabusStatus(course))}`}
                                                                    style={{ fontSize: "0.75rem", padding: "3px 6px" }}
                                                                >
                                                                    {getStatusLabel(getSyllabusStatus(course))}
                                                                </span>
                                                            </td>
                                                            <td className="py-1">{renderActionButtons(course, "course")}</td>
                                                        </tr>
                                                    );
                                                }

                                                const group = entry.data;
                                                const groupSubjects = subjects[group.id] || [];
                                                const isExpanded = Boolean(expandedGroups[group.id]);

                                                return (
                                                    <React.Fragment key={`t1-group-${group.id}`}>
                                                        <tr style={{ height: "42px" }}>
                                                            <td className="py-1">{serial}</td>
                                                            <td className="py-1">-</td>
                                                            <td className="text-start ps-2 py-1">
                                                                <div
                                                                    className="d-flex align-items-center justify-content-between text-primary fw-semibold"
                                                                    style={{ cursor: "pointer" }}
                                                                    onClick={() => handleToggleElectiveGroup(group)}
                                                                >
                                                                    <span className="text-truncate" title={group.name}>{group.name}</span>
                                                                    <span className="badge bg-primary-subtle text-primary small ms-1 text-nowrap" style={{ fontSize: "0.72rem" }}>
                                                                        <i className={`bi bi-chevron-${isExpanded ? "up" : "down"} me-1`}></i>
                                                                        {isExpanded ? "Hide" : "View"}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-1">{formatNumber(group.lecture)}</td>
                                                            <td className="py-1">{formatNumber(group.tutorial)}</td>
                                                            <td className="py-1">{formatNumber(group.practical)}</td>
                                                            <td className="fw-semibold py-1">{formatNumber(getCredit(group))}</td>
                                                            <td className="py-1">
                                                                <span className="badge bg-secondary-subtle text-secondary text-nowrap" style={{ fontSize: "0.75rem", padding: "3px 6px" }}>
                                                                    Elective Slot
                                                                </span>
                                                            </td>
                                                            <td className="py-1">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-secondary py-0 px-2 text-nowrap"
                                                                    style={{ fontSize: "0.78rem" }}
                                                                    onClick={() => handleToggleElectiveGroup(group)}
                                                                >
                                                                    {isExpanded ? "Collapse" : "Subjects"}
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* EXPANDED SUBJECTS */}
                                                        {isExpanded && (
                                                            <tr className="bg-light">
                                                                <td colSpan="9" className="p-2">
                                                                    <div className="border rounded bg-white p-2 shadow-sm text-start">
                                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                                            <h6 className="fw-bold mb-0 text-primary small">
                                                                                <i className="bi bi-list-ul me-1"></i>
                                                                                Subjects in {group.name}
                                                                            </h6>
                                                                            {subjectsLoading[group.id] && (
                                                                                <span className="spinner-border spinner-border-sm text-primary"></span>
                                                                            )}
                                                                        </div>
                                                                        {subjectsLoading[group.id] ? (
                                                                            <div className="text-muted small">Loading subjects...</div>
                                                                        ) : groupSubjects.length === 0 ? (
                                                                            <div className="alert alert-warning mb-0 small py-1">No subjects available in this group.</div>
                                                                        ) : (
                                                                            <table
                                                                                className="table table-sm table-bordered align-middle mb-0 text-center"
                                                                                style={{ width: "100%", fontSize: "0.82rem" }}
                                                                            >
                                                                                <colgroup>
                                                                                    <col style={{ width: "45px" }} />
                                                                                    <col style={{ width: "130px" }} />
                                                                                    <col />
                                                                                    <col style={{ width: "38px" }} />
                                                                                    <col style={{ width: "38px" }} />
                                                                                    <col style={{ width: "38px" }} />
                                                                                    <col style={{ width: "42px" }} />
                                                                                    <col style={{ width: "110px" }} />
                                                                                    <col style={{ width: "175px" }} />
                                                                                </colgroup>
                                                                                <thead className="table-secondary">
                                                                                    <tr>
                                                                                        <th className="py-0.5">#</th>
                                                                                        <th className="py-0.5">Subject Code</th>
                                                                                        <th className="text-start ps-2 py-0.5">Subject Name</th>
                                                                                        <th className="py-0.5">L</th>
                                                                                        <th className="py-0.5">R</th>
                                                                                        <th className="py-0.5">P</th>
                                                                                        <th className="py-0.5">C</th>
                                                                                        <th className="py-0.5">Status</th>
                                                                                        <th className="py-0.5">Action</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {groupSubjects.map((sub, sIdx) => (
                                                                                        <tr key={`group-${group.id}-sub-${sub.id}`}>
                                                                                            <td className="py-1">{sIdx + 1}</td>
                                                                                            <td className="fw-semibold text-truncate py-1" title={sub.courseCode}>
                                                                                                {sub.courseCode || "-"}
                                                                                            </td>
                                                                                            <td className="text-start ps-2 text-truncate py-1" title={sub.courseName}>
                                                                                                <span>{sub.courseName}</span>
                                                                                                {sub.offeringDepartment && (
                                                                                                    <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle ms-1 py-0 px-1" style={{ fontSize: "0.7rem" }}>
                                                                                                        {sub.offeringDepartment}
                                                                                                    </span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="py-1">{formatNumber(sub.lecture)}</td>
                                                                                            <td className="py-1">{formatNumber(sub.tutorial)}</td>
                                                                                            <td className="py-1">{formatNumber(sub.practical)}</td>
                                                                                            <td className="fw-semibold py-1">{formatNumber(getCredit(sub))}</td>
                                                                                            <td className="py-1">
                                                                                                <span
                                                                                                    className={`badge ${getStatusBadgeClass(getSyllabusStatus(sub))}`}
                                                                                                    style={{ fontSize: "0.72rem", padding: "2px 5px" }}
                                                                                                >
                                                                                                    {getStatusLabel(getSyllabusStatus(sub))}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="py-1">{renderActionButtons(sub, "elective")}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}

                                            {/* TRACK 1 TOTAL */}
                                            <tr className="table-light fw-bold">
                                                <td colSpan="3" className="text-end pe-2 py-1">Total</td>
                                                <td className="py-1">{formatNumber(track1Lecture)}</td>
                                                <td className="py-1">{formatNumber(track1Tutorial)}</td>
                                                <td className="py-1">{formatNumber(track1Practical)}</td>
                                                <td className="fw-bold py-1">{formatNumber(track1Credits)}</td>
                                                <td className="py-1"></td>
                                                <td className="py-1"></td>
                                            </tr>

                                            {/* TRACK 2 (AFTER OR) */}
                                            {hasAltTrack && (
                                                <>
                                                    <tr className="table-secondary text-center fw-bold">
                                                        <td colSpan="9" className="py-1 fs-6 text-uppercase">
                                                            Or
                                                        </td>
                                                    </tr>

                                                    {track2Items.map((entry, idx) => {
                                                        const course = entry.data;
                                                        return (
                                                            <tr key={`t2-course-${course.id}`} style={{ height: "42px" }}>
                                                                <td className="py-1">{idx + 1}</td>
                                                                <td className="fw-semibold text-truncate py-1" title={course.courseCode}>
                                                                    {course.courseCode}
                                                                </td>
                                                                <td className="text-start ps-2 fw-semibold text-truncate py-1" title={course.courseName}>
                                                                    {course.courseName}
                                                                </td>
                                                                <td className="py-1">{formatNumber(course.lecture)}</td>
                                                                <td className="py-1">{formatNumber(course.tutorial)}</td>
                                                                <td className="py-1">{formatNumber(course.practical)}</td>
                                                                <td className="fw-semibold py-1">{formatNumber(getCredit(course))}</td>
                                                                <td className="py-1">
                                                                    <span
                                                                        className={`badge ${getStatusBadgeClass(getSyllabusStatus(course))}`}
                                                                        style={{ fontSize: "0.75rem", padding: "3px 6px" }}
                                                                    >
                                                                        {getStatusLabel(getSyllabusStatus(course))}
                                                                    </span>
                                                                </td>
                                                                <td className="py-1">{renderActionButtons(course, "course")}</td>
                                                            </tr>
                                                        );
                                                    })}

                                                    <tr className="table-light fw-bold">
                                                        <td colSpan="3" className="text-end pe-2 py-1">Total</td>
                                                        <td className="py-1">{formatNumber(track2Lecture)}</td>
                                                        <td className="py-1">{formatNumber(track2Tutorial)}</td>
                                                        <td className="py-1">{formatNumber(track2Practical)}</td>
                                                        <td className="fw-bold py-1">{formatNumber(track2Credits)}</td>
                                                        <td className="py-1"></td>
                                                        <td className="py-1"></td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TEXT SYLLABUS MODAL */}
            {textModal.open && (
                <TextSyllabusModal
                    item={textModal.item}
                    type={textModal.type}
                    readOnly={textModal.readOnly}
                    isAdmin={true}
                    programHeader={programHeader}
                    onClose={() => setTextModal({ open: false, item: null, type: "course", readOnly: false })}
                    onSuccess={() => handleLoadCurriculum()}
                />
            )}

            {/* SYLLABUS AUDIT LOG MODAL */}
            {logModal.open && (
                <SyllabusAuditLogModal
                    syllabusId={logModal.syllabusId}
                    courseTitle={logModal.title}
                    onClose={() => setLogModal({ open: false, syllabusId: null, title: "" })}
                />
            )}
        </AdminLayout>
    );
}

export default Curriculum;