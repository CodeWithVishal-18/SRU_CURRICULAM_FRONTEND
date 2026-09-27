import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
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

export default function FacultyPortal() {
    const { user, logout } = useAuth();

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
    const [curriculumLoading, setCurriculumLoading] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState({});

    const [textModal, setTextModal] = useState({
        open: false,
        item: null,
        type: "course",
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [regRes, deptRes, progRes] = await Promise.all([
                    getAllRegulations(),
                    getAllDepartments(),
                    getAllPrograms().catch(() => ({ data: [] })),
                ]);
                setRegulations(regRes?.data || []);
                setDepartments(deptRes?.data || []);
                setAllPrograms(progRes?.data || []);

                if (user?.departmentCode) {
                    setDepartmentCode(user.departmentCode.trim().toUpperCase());
                }
            } catch (err) {
                toast.error("Failed to load options");
            }
        };
        loadInitialData();
    }, [user]);

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
            list.push({ value: String(i), label: `Semester ${roman[i - 1] || i}` });
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

    const attachCourseSyllabusStatus = async (courses = []) => {
        return Promise.all(
            courses.map(async (course) => {
                try {
                    const response = await getCourseSyllabusStatus(course.id);
                    const data = response?.data || response || {};
                    return {
                        ...course,
                        syllabusId: data?.syllabusId || course?.syllabusId || null,
                        syllabusStatus: data?.syllabusStatus || data?.status || "NOT_UPLOADED",
                    };
                } catch {
                    return { ...course, syllabusStatus: "NOT_UPLOADED" };
                }
            })
        );
    };

    const handleLoadCurriculum = async () => {
        if (!regulationCode || !departmentCode || !programCode || !semester) {
            toast.error("Please fill in all filters");
            return;
        }

        try {
            setCurriculumLoading(true);
            clearCurriculum();

            const sem = Number(semester);
            const response = await getSemesterCurriculum(regulationCode, departmentCode, sem, programCode);
            const data = response?.data || response || {};
            const single = {
                semester: sem,
                courses: data?.courses || [],
                electiveGroups: data?.electiveGroups || data?.electives || [],
            };
            single.courses = await attachCourseSyllabusStatus(single.courses);
            setCurricula([single]);
        } catch (err) {
            toast.error("Failed to load curriculum");
        } finally {
            setCurriculumLoading(false);
        }
    };

    const handleToggleElectiveGroup = async (group) => {
        const groupId = group.id;
        setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

        if (subjects[groupId]?.length > 0) return;

        try {
            setSubjectsLoading((prev) => ({ ...prev, [groupId]: true }));
            const response = await getElectiveSubjects(groupId);
            const data = response?.data || response?.subjects || response || [];
            const list = Array.isArray(data) ? data : [];
            const withStatus = await Promise.all(
                list.map(async (sub) => {
                    try {
                        const res = await getElectiveSubjectSyllabusStatus(sub.id);
                        return { ...sub, syllabusId: res.data?.syllabusId, syllabusStatus: res.data?.status || "NOT_UPLOADED" };
                    } catch {
                        return { ...sub, syllabusStatus: "NOT_UPLOADED" };
                    }
                })
            );
            setSubjects((prev) => ({ ...prev, [groupId]: withStatus }));
        } catch {
            toast.error("Failed to load subjects");
        } finally {
            setSubjectsLoading((prev) => ({ ...prev, [groupId]: false }));
        }
    };

    return (
        <div className="min-vh-100 bg-light">
            {/* TOP NAVBAR */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-4 py-2 shadow-sm">
                <div className="container-fluid">
                    <span className="navbar-brand fw-bold fs-5">SRU Curriculam Portal</span>
                    <div className="d-flex align-items-center gap-3">
                        <span className="text-white fw-semibold small">
                            <i className="bi bi-person-circle me-1"></i> {user?.name || "Faculty"} ({user?.employeeId})
                        </span>
                        <button className="btn btn-outline-light btn-sm" onClick={logout}>
                            <i className="bi bi-box-arrow-right me-1"></i> Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* FILTER SECTION */}
            <div className="container-fluid px-4 py-4">
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-3">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold mb-1">Regulation *</label>
                                <select className="form-select form-select-sm" value={regulationCode} onChange={(e) => { setRegulationCode(e.target.value); clearCurriculum(); }}>
                                    <option value="">Select Regulation</option>
                                    {regulations.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold mb-1">Department *</label>
                                <select className="form-select form-select-sm" value={departmentCode} onChange={(e) => { setDepartmentCode(e.target.value); clearCurriculum(); }}>
                                    <option value="">Select Department</option>
                                    {departments.map((d) => <option key={d.code} value={d.code}>{d.name} ({d.code})</option>)}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-semibold mb-1">Degree Programme *</label>
                                <select className="form-select form-select-sm" value={programCode} onChange={(e) => { setProgramCode(e.target.value); clearCurriculum(); }}>
                                    <option value="">Select Degree Programme</option>
                                    {availablePrograms.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-semibold mb-1">Semester *</label>
                                <select className="form-select form-select-sm" value={semester} onChange={(e) => { setSemester(e.target.value); clearCurriculum(); }}>
                                    <option value="">Select Semester</option>
                                    {semesterOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div className="col-md-1">
                                <button className="btn btn-sm btn-primary w-100" onClick={handleLoadCurriculum} disabled={curriculumLoading}>
                                    {curriculumLoading ? <span className="spinner-border spinner-border-sm"></span> : "View"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* READ ONLY TABLE */}
                {curricula.map((curr) => (
                    <div key={curr.semester} className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-primary text-white py-2 px-3">
                            <h6 className="fw-bold mb-0">Semester {curr.semester} - {programHeader}</h6>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-sm table-bordered align-middle text-center mb-0" style={{ fontSize: "0.85rem" }}>
                                <thead className="table-primary text-dark fw-semibold">
                                    <tr>
                                        <th>S.No.</th>
                                        <th>Course Code</th>
                                        <th className="text-start ps-2">Course</th>
                                        <th>L</th><th>R</th><th>P</th><th>C</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {curr.courses.map((c, idx) => {
                                        const isUploaded = c.syllabusStatus === "UPLOADED" || c.syllabusStatus === "APPROVED";
                                        return (
                                            <tr key={c.id}>
                                                <td>{idx + 1}</td>
                                                <td className="fw-semibold">{c.courseCode}</td>
                                                <td className="text-start ps-2">{c.courseName}</td>
                                                <td>{c.lecture}</td><td>{c.tutorial}</td><td>{c.practical}</td>
                                                <td className="fw-bold">{c.credits}</td>
                                                <td>
                                                    <span className={`badge ${isUploaded ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}>
                                                        {isUploaded ? "Uploaded" : "Not Uploaded"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary py-0 px-2"
                                                        disabled={!isUploaded}
                                                        onClick={() => setTextModal({ open: true, item: c, type: "course" })}
                                                    >
                                                        <i className="bi bi-eye me-1"></i> View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* SYLLABUS MODAL WITH ADD REMARK OPTION */}
            {textModal.open && (
                <TextSyllabusModal
                    item={textModal.item}
                    type={textModal.type}
                    readOnly={true}
                    isAdmin={false}
                    isFaculty={true}
                    programHeader={programHeader}
                    onClose={() => setTextModal({ open: false, item: null, type: "course" })}
                />
            )}
        </div>
    );
}