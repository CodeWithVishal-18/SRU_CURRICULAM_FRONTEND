import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import FacultyLayout from "../../layouts/FacultyLayout";
import { useAuth } from "../../context/AuthContext";
import { getAllRegulations } from "../../services/regulationService";
import { getAllDepartments } from "../../services/departmentService";
import api from "../../services/api";
import {
    getSemesterCurriculum,
    getElectiveSubjects,
    selectElectives,
    uploadCourseSyllabus,
    uploadElectiveSubjectSyllabus,
    getCourseSyllabusStatus,
    getElectiveSubjectSyllabusStatus,
    getSyllabusFileUrl,
} from "../../services/curriculumService";

function FacultyCurriculum() {
    const { user } = useAuth();

    // =========================================================
    // STATE
    // =========================================================
    const [regulations, setRegulations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [regulationCode, setRegulationCode] = useState("");
    const [departmentCode, setDepartmentCode] = useState("");
    const [semester, setSemester] = useState("");
    const [curricula, setCurricula] = useState([]);
    const [selections, setSelections] = useState({});
    const [subjects, setSubjects] = useState({});
    const [initialLoading, setInitialLoading] = useState(true);
    const [curriculumLoading, setCurriculumLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState({});

    // =========================================================
    // SYLLABUS STATES
    // =========================================================
    const [expandedGroups, setExpandedGroups] = useState({});
    const [uploadModal, setUploadModal] = useState({
        open: false,
        type: "",
        item: null,
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // =========================================================
    // REJECTION REMARKS MODAL STATE
    // =========================================================
    const [remarksModal, setRemarksModal] = useState({
        open: false,
        item: null,
        type: "",
        loading: false,
        reason: "",
        reviewedBy: "",
        reviewedAt: "",
    });

    // =========================================================
    // USER DEPARTMENT & PERMISSIONS
    // =========================================================
    const userDepartmentCode = user?.departmentCode
        ?.trim()
        .toUpperCase();

    const isFaculty = Boolean(
        user && (user.role === "HOD" || user.role === "DEAN")
    );

    const isOwnDepartment = Boolean(
        isFaculty &&
        userDepartmentCode &&
        departmentCode &&
        userDepartmentCode === departmentCode.trim().toUpperCase()
    );

    // Core course syllabus: Own department only
    const canUploadCourse = isOwnDepartment;

    // Elective subject syllabus: Any HOD / DEAN can upload
    const canUploadElective = isFaculty;

    // =========================================================
    // SEMESTERS
    // =========================================================
    const semesters = [
        { value: "1", label: "Semester I" },
        { value: "2", label: "Semester II" },
        { value: "3", label: "Semester III" },
        { value: "4", label: "Semester IV" },
        { value: "5", label: "Semester V" },
        { value: "6", label: "Semester VI" },
        { value: "7", label: "Semester VII" },
        { value: "8", label: "Semester VIII" },
    ];

    // =========================================================
    // INITIAL DATA
    // =========================================================
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setInitialLoading(true);
                const [regulationResponse, departmentResponse] = await Promise.all([
                    getAllRegulations(),
                    getAllDepartments(),
                ]);
                setRegulations(regulationResponse?.data || []);
                setDepartments(departmentResponse?.data || []);

                if (userDepartmentCode) {
                    setDepartmentCode(userDepartmentCode);
                }
            } catch (error) {
                console.error("Failed to load initial data:", error);
                toast.error("Failed to load regulations or departments");
            } finally {
                setInitialLoading(false);
            }
        };
        loadInitialData();
    }, [userDepartmentCode]);

    // =========================================================
    // CLEAR CURRICULUM
    // =========================================================
    const clearCurriculum = () => {
        setCurricula([]);
        setSubjects({});
        setSelections({});
        setSubjectsLoading({});
        setExpandedGroups({});
    };

    const handleRegulationChange = (event) => {
        setRegulationCode(event.target.value);
        clearCurriculum();
    };

    const handleDepartmentChange = (event) => {
        setDepartmentCode(event.target.value);
        clearCurriculum();
    };

    const handleSemesterChange = (event) => {
        setSemester(event.target.value);
        clearCurriculum();
    };

    // =========================================================
    // NORMALIZE CURRICULUM RESPONSE
    // =========================================================
    const normalizeCurriculumResponse = (response, semesterNumber) => {
        const data = response?.data || response || {};
        return {
            semester: semesterNumber,
            courses: data?.courses || [],
            electiveGroups: data?.electiveGroups || data?.electives || [],
        };
    };

    // =========================================================
    // FETCH PERSISTED SYLLABUS STATUS
    // =========================================================
    const attachCourseSyllabusStatus = async (courses = []) => {
        return Promise.all(
            courses.map(async (course) => {
                try {
                    const response = await getCourseSyllabusStatus(course.id);
                    const data = response?.data || response || {};
                    const syllabus = data?.syllabus || data?.syllabusDetails || null;
                    return {
                        ...course,
                        syllabusId:
                            data?.syllabusId ||
                            syllabus?.id ||
                            syllabus?.syllabusId ||
                            course?.syllabusId ||
                            null,
                        syllabusStatus:
                            data?.syllabusStatus ||
                            data?.status ||
                            syllabus?.status ||
                            course?.syllabusStatus ||
                            "NOT_UPLOADED",
                        syllabus: syllabus || course?.syllabus || null,
                        fileName:
                            data?.fileName ||
                            data?.originalFileName ||
                            syllabus?.fileName ||
                            syllabus?.originalFileName ||
                            course?.fileName ||
                            null,
                        rejectionReason:
                            data?.rejectionReason ||
                            syllabus?.rejectionReason ||
                            course?.rejectionReason ||
                            null,
                    };
                } catch (error) {
                    return {
                        ...course,
                        syllabusStatus: course?.syllabusStatus || "NOT_UPLOADED",
                    };
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
                        syllabusId:
                            data?.syllabusId ||
                            syllabus?.id ||
                            syllabus?.syllabusId ||
                            subject?.syllabusId ||
                            null,
                        syllabusStatus:
                            data?.syllabusStatus ||
                            data?.status ||
                            syllabus?.status ||
                            subject?.syllabusStatus ||
                            "NOT_UPLOADED",
                        syllabus: syllabus || subject?.syllabus || null,
                        fileName:
                            data?.fileName ||
                            data?.originalFileName ||
                            syllabus?.fileName ||
                            syllabus?.originalFileName ||
                            subject?.fileName ||
                            null,
                        rejectionReason:
                            data?.rejectionReason ||
                            syllabus?.rejectionReason ||
                            subject?.rejectionReason ||
                            null,
                    };
                } catch (error) {
                    return {
                        ...subject,
                        syllabusStatus: subject?.syllabusStatus || "NOT_UPLOADED",
                    };
                }
            })
        );
    };

    // =========================================================
    // LOAD CURRICULUM
    // =========================================================
    const handleLoadCurriculum = async () => {
        if (!regulationCode) {
            toast.error("Please select a regulation");
            return;
        }
        if (!departmentCode) {
            toast.error("Please select a department");
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
                const semesterNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
                const responses = await Promise.all(
                    semesterNumbers.map(async (sem) => {
                        try {
                            const response = await getSemesterCurriculum(
                                regulationCode,
                                departmentCode,
                                sem
                            );
                            const normalized = normalizeCurriculumResponse(response, sem);
                            normalized.courses = await attachCourseSyllabusStatus(
                                normalized.courses
                            );
                            return normalized;
                        } catch (error) {
                            console.error(`Failed to load Semester ${sem}:`, error);
                            return {
                                semester: sem,
                                courses: [],
                                electiveGroups: [],
                            };
                        }
                    })
                );
                setCurricula(responses);
                const allGroups = responses.flatMap(
                    (item) => item.electiveGroups || []
                );
                await loadElectiveSubjects(allGroups);
                const existingSelections = {};
                allGroups.forEach((group) => {
                    existingSelections[group.id] = (
                        group.selectedSubjects || []
                    ).map((subject) => Number(subject.id));
                });
                setSelections(existingSelections);
                return;
            }

            const sem = Number(semester);
            const response = await getSemesterCurriculum(
                regulationCode,
                departmentCode,
                sem
            );
            const singleCurriculum = normalizeCurriculumResponse(response, sem);
            singleCurriculum.courses = await attachCourseSyllabusStatus(
                singleCurriculum.courses
            );
            setCurricula([singleCurriculum]);
            const groups = singleCurriculum.electiveGroups || [];
            await loadElectiveSubjects(groups);
            const existingSelections = {};
            groups.forEach((group) => {
                existingSelections[group.id] = (
                    group.selectedSubjects || []
                ).map((subject) => Number(subject.id));
            });
            setSelections(existingSelections);
        } catch (error) {
            console.error("Failed to load curriculum:", error);
            toast.error(
                error?.response?.data?.message || "Failed to load curriculum"
            );
            clearCurriculum();
        } finally {
            setCurriculumLoading(false);
        }
    };

    // =========================================================
    // LOAD ELECTIVE SUBJECTS
    // =========================================================
    const loadElectiveSubjects = async (groups) => {
        const subjectMap = {};
        for (const group of groups) {
            try {
                setSubjectsLoading((previous) => ({
                    ...previous,
                    [group.id]: true,
                }));
                const response = await getElectiveSubjects(group.id);
                const data =
                    response?.data ||
                    response?.subjects ||
                    response ||
                    [];
                const subjectList = Array.isArray(data) ? data : [];
                subjectMap[group.id] = await attachElectiveSyllabusStatus(subjectList);
            } catch (error) {
                console.error(
                    `Failed to load subjects for group ${group.id}:`,
                    error
                );
                subjectMap[group.id] = [];
            } finally {
                setSubjectsLoading((previous) => ({
                    ...previous,
                    [group.id]: false,
                }));
            }
        }
        setSubjects((prev) => ({ ...prev, ...subjectMap }));
    };

    // =========================================================
    // TOGGLE ELECTIVE GROUP
    // =========================================================
    const handleToggleElectiveGroup = async (group) => {
        const groupId = group.id;
        setExpandedGroups((previous) => ({
            ...previous,
            [groupId]: !previous[groupId],
        }));

        if (subjects[groupId]) {
            return;
        }

        try {
            setSubjectsLoading((previous) => ({
                ...previous,
                [groupId]: true,
            }));
            const response = await getElectiveSubjects(groupId);
            const data =
                response?.data ||
                response?.subjects ||
                response ||
                [];
            const subjectList = Array.isArray(data) ? data : [];
            const subjectsWithSyllabusStatus = await attachElectiveSyllabusStatus(subjectList);
            setSubjects((previous) => ({
                ...previous,
                [groupId]: subjectsWithSyllabusStatus,
            }));
        } catch (error) {
            console.error("Failed to load elective subjects:", error);
            toast.error("Failed to load elective subjects");
        } finally {
            setSubjectsLoading((previous) => ({
                ...previous,
                [groupId]: false,
            }));
        }
    };

    // =========================================================
    // ELECTIVE & COURSE HELPERS
    // =========================================================
    const isExcludedCourse = (course) => {
        const code = String(course?.courseCode || "")
            .trim()
            .toUpperCase();
        return code.includes("HN") || code.includes("MN");
    };

    const formatNumber = (value) => {
        const number = Number(value) || 0;
        return Number.isInteger(number)
            ? number
            : Number(number.toFixed(2));
    };

    const getCredit = (item) => {
        const stored = Number(item?.credits);
        if (Number.isFinite(stored) && stored > 0) {
            return stored;
        }
        const lecture = Number(item?.lecture) || 0;
        const tutorial = Number(item?.tutorial) || 0;
        const practical = Number(item?.practical) || 0;
        if (lecture === 0 && tutorial === 0 && practical === 0) {
            return 0;
        }
        return lecture + 0.5 * tutorial + 0.5 * practical;
    };

    // =========================================================
    // SEPARATE STANDARD AND ALTERNATIVE ("Or") TRACKS
    // =========================================================
    const getSemesterTracks = (curriculum) => {
        const semNum = Number(curriculum.semester);
        const courses = (curriculum.courses || []).filter((c) => !isExcludedCourse(c));
        const electives = curriculum.electiveGroups || [];

        const isAltCourse = (c) =>
            Boolean(c.isAlternative) ||
            (semNum === 7 && (
                Number(c.credits) === 20 ||
                (c.courseCode && c.courseCode.toUpperCase().includes("PR402")) ||
                (c.courseName && c.courseName.toLowerCase().includes("industrial project"))
            ));

        const altCourses = courses.filter(isAltCourse);
        const mainCourses = courses.filter((c) => !isAltCourse(c));

        if (semNum === 7) {
            const findElective = (term) =>
                electives.find((g) => (g.name || "").toLowerCase().includes(term.toLowerCase()));

            const pe2 = findElective("Program Elective - II") || findElective("Program Elective-II");
            const pe3 = findElective("Program Elective - III") || findElective("Program Elective-III");
            const pe4 = findElective("Program Elective - IV") || findElective("Program Elective-IV");
            const oe2 = findElective("Open Elective - II") || findElective("Open Elective-II");
            const se2 = findElective("Specialization Elective - II") || findElective("Specialization Elective-II");

            const capstone = mainCourses.find((c) =>
                (c.courseCode && c.courseCode.toUpperCase().includes("PR401")) ||
                (c.courseName && c.courseName.toLowerCase().includes("capstone"))
            ) || mainCourses[0];

            const track1Items = [];
            const usedElectiveIds = new Set();

            const addElective = (el) => {
                if (el && !usedElectiveIds.has(el.id)) {
                    track1Items.push({ type: "elective", data: el });
                    usedElectiveIds.add(el.id);
                }
            };

            addElective(pe2);
            addElective(pe3);
            addElective(pe4);
            addElective(oe2);
            if (capstone) {
                track1Items.push({ type: "course", data: capstone });
            }
            addElective(se2);

            electives.forEach((el) => {
                if (!usedElectiveIds.has(el.id)) addElective(el);
            });
            mainCourses.forEach((c) => {
                if (c !== capstone) track1Items.push({ type: "course", data: c });
            });

            const track2Items = altCourses.map((c) => ({ type: "course", data: c }));

            return {
                hasAltTrack: track2Items.length > 0,
                track1Items,
                track2Items,
            };
        }

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

    // =========================================================
    // SYLLABUS UI HELPERS
    // =========================================================
    const getSyllabusObject = (item) => {
        return (
            item?.syllabus ||
            item?.syllabusResponse ||
            item?.syllabusDetails ||
            null
        );
    };

    const getSyllabusId = (item) => {
        const syllabus = getSyllabusObject(item);
        return (
            syllabus?.id ||
            syllabus?.syllabusId ||
            item?.syllabusId ||
            item?.syllabusID ||
            item?.uploadedSyllabusId ||
            null
        );
    };

    const getSyllabusStatus = (item) => {
        const syllabus = getSyllabusObject(item);
        return String(
            syllabus?.status ||
            syllabus?.syllabusStatus ||
            item?.syllabusStatus ||
            item?.status ||
            "NOT_UPLOADED"
        ).toUpperCase();
    };

    const getStatusBadgeClass = (status) => {
        const normalizedStatus = String(status || "").trim().toUpperCase();
        if (normalizedStatus === "APPROVED" || normalizedStatus === "ACCEPTED") {
            return "bg-success-subtle text-success";
        }
        if (normalizedStatus === "REJECTED" || normalizedStatus === "DECLINED") {
            return "bg-danger-subtle text-danger";
        }
        if (normalizedStatus === "PENDING" || normalizedStatus === "UNDER_REVIEW") {
            return "bg-warning-subtle text-warning-emphasis";
        }
        if (normalizedStatus === "UPLOADED" || normalizedStatus === "SUBMITTED") {
            return "bg-info-subtle text-info";
        }
        return "bg-secondary-subtle text-secondary";
    };

    const getStatusLabel = (status) => {
        const normalizedStatus = String(status || "").trim().toUpperCase();
        if (normalizedStatus === "NOT_UPLOADED") return "Not Uploaded";
        if (normalizedStatus === "UPLOADED") return "Uploaded";
        if (normalizedStatus === "SUBMITTED") return "Submitted";
        if (normalizedStatus === "PENDING") return "Pending Review";
        if (normalizedStatus === "UNDER_REVIEW") return "Under Review";
        if (normalizedStatus === "APPROVED") return "Approved";
        if (normalizedStatus === "REJECTED" || normalizedStatus === "DECLINED") return "Rejected";
        return normalizedStatus
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    };

    // =========================================================
    // VIEW REJECTION REMARKS MODAL HANDLER
    // =========================================================
    const handleViewRejectionRemarks = async (item, type) => {
        const syllabus = getSyllabusObject(item);
        const existingReason =
            syllabus?.rejectionReason ||
            item?.rejectionReason ||
            null;

        setRemarksModal({
            open: true,
            item,
            type,
            loading: !existingReason,
            reason: existingReason || "",
            reviewedBy: syllabus?.reviewedBy || item?.reviewedBy || "Admin",
            reviewedAt: syllabus?.reviewedAt || item?.reviewedAt || "",
        });

        const syllabusId = getSyllabusId(item);
        if (syllabusId && !existingReason) {
            try {
                const response = await api.get(`/api/syllabi/${syllabusId}`);
                const data = response?.data?.data || response?.data || {};
                setRemarksModal((prev) => ({
                    ...prev,
                    loading: false,
                    reason: data.rejectionReason || "No explicit reason was provided.",
                    reviewedBy: data.reviewedBy || prev.reviewedBy,
                    reviewedAt: data.reviewedAt || prev.reviewedAt,
                }));
            } catch (error) {
                console.error("Failed to fetch rejection details:", error);
                setRemarksModal((prev) => ({
                    ...prev,
                    loading: false,
                    reason: "Please replace the syllabus file as per administrative instructions.",
                }));
            }
        }
    };

    const closeRemarksModal = () => {
        setRemarksModal({
            open: false,
            item: null,
            type: "",
            loading: false,
            reason: "",
            reviewedBy: "",
            reviewedAt: "",
        });
    };

    const openUploadModal = (type, item) => {
        const canUpload = type === "elective" ? canUploadElective : canUploadCourse;
        if (!canUpload) {
            toast.error("You can only upload core course syllabi for your own department.");
            return;
        }

        setSelectedFile(null);
        setUploadModal({
            open: true,
            type,
            item,
        });
    };

    const closeUploadModal = () => {
        if (uploading) return;
        setUploadModal({
            open: false,
            type: "",
            item: null,
        });
        setSelectedFile(null);
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            setSelectedFile(null);
            return;
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("File size must not exceed 10 MB");
            event.target.value = "";
            setSelectedFile(null);
            return;
        }
        const isPdf =
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            toast.error("Please upload a PDF file only");
            event.target.value = "";
            setSelectedFile(null);
            return;
        }
        setSelectedFile(file);
    };

    const handleUploadSyllabus = async () => {
        if (!selectedFile) {
            toast.error("Please select a PDF file");
            return;
        }
        const item = uploadModal.item;
        if (!item?.id) {
            toast.error("Unable to identify the selected subject");
            return;
        }
        try {
            setUploading(true);
            let uploadResponse;
            if (uploadModal.type === "course") {
                uploadResponse = await uploadCourseSyllabus(
                    item.id,
                    selectedFile
                );
            }
            if (uploadModal.type === "elective") {
                uploadResponse = await uploadElectiveSubjectSyllabus(
                    item.id,
                    selectedFile
                );
            }

            const uploadedSyllabus = uploadResponse?.data || uploadResponse || {};
            const uploadedSyllabusId =
                uploadedSyllabus?.id || uploadedSyllabus?.syllabusId || null;
            const uploadedStatus = uploadedSyllabus?.status || "UPLOADED";

            setCurricula((previousCurricula) =>
                previousCurricula.map((curriculum) => ({
                    ...curriculum,
                    courses: (curriculum.courses || []).map((course) => {
                        if (
                            uploadModal.type === "course" &&
                            Number(course.id) === Number(item.id)
                        ) {
                            return {
                                ...course,
                                syllabusId: uploadedSyllabusId || course.syllabusId,
                                syllabusStatus: uploadedStatus,
                                syllabus: uploadedSyllabusId
                                    ? uploadedSyllabus
                                    : course.syllabus,
                                rejectionReason: null,
                            };
                        }
                        return course;
                    }),
                    electiveGroups: (curriculum.electiveGroups || []).map((group) => ({
                        ...group,
                        selectedSubjects: group.selectedSubjects || [],
                    })),
                }))
            );

            if (uploadModal.type === "elective") {
                setSubjects((previousSubjects) => {
                    const updatedSubjects = { ...previousSubjects };
                    Object.keys(updatedSubjects).forEach((groupId) => {
                        updatedSubjects[groupId] = (
                            updatedSubjects[groupId] || []
                        ).map((subject) => {
                            if (Number(subject.id) === Number(item.id)) {
                                return {
                                    ...subject,
                                    syllabusId: uploadedSyllabusId || subject.syllabusId,
                                    syllabusStatus: uploadedStatus,
                                    syllabus: uploadedSyllabusId
                                        ? uploadedSyllabus
                                        : subject.syllabus,
                                    rejectionReason: null,
                                };
                            }
                            return subject;
                        });
                    });
                    return updatedSubjects;
                });
            }
            toast.success("Syllabus uploaded successfully");
            closeUploadModal();
        } catch (error) {
            console.error("Syllabus upload failed:", error);
            toast.error(
                error?.response?.data?.message || "Failed to upload syllabus"
            );
        } finally {
            setUploading(false);
        }
    };

    const handleViewSyllabus = async (item) => {
        const syllabusId = getSyllabusId(item);
        if (!syllabusId) {
            toast.error("Syllabus file is not available");
            return;
        }
        try {
            const fileUrl = getSyllabusFileUrl(syllabusId);
            const response = await api.get(fileUrl, {
                responseType: "blob",
            });
            const blobUrl = window.URL.createObjectURL(response.data);
            window.open(blobUrl, "_blank", "noopener,noreferrer");
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 60000);
        } catch (error) {
            console.error("Failed to open syllabus:", error);
            toast.error(
                error?.response?.data?.message || "Unable to open syllabus file"
            );
        }
    };

    // =========================================================
    // DYNAMIC SYLLABUS ACTIONS WITH REJECTION REMARK ICON
    // =========================================================
    const renderSyllabusActions = (item, type) => {
        const syllabusId = getSyllabusId(item);
        const status = getSyllabusStatus(item);
        const isRejected = status === "REJECTED" || status === "DECLINED";
        const canUpload = type === "elective" ? canUploadElective : canUploadCourse;

        return (
            <div className="d-flex flex-column align-items-center gap-1">
                <span className={`badge ${getStatusBadgeClass(status)}`}>
                    {getStatusLabel(status)}
                </span>
                <div className="d-flex flex-wrap justify-content-center align-items-center gap-1 mt-1">
                    {/* View Rejection Remark Button */}
                    {isRejected && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-2"
                            onClick={() => handleViewRejectionRemarks(item, type)}
                            title="View Rejection Remark"
                        >
                            <i className="bi bi-chat-right-text me-1"></i>
                            Remark
                        </button>
                    )}

                    {/* View File Button */}
                    {syllabusId && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-0 px-2"
                            onClick={() => handleViewSyllabus(item)}
                        >
                            <i className="bi bi-eye me-1"></i>
                            View
                        </button>
                    )}

                    {/* Upload / Replace Button */}
                    {canUpload && (
                        <button
                            type="button"
                            className={`btn btn-sm py-0 px-2 ${
                                isRejected
                                    ? "btn-danger"
                                    : "btn-outline-success"
                            }`}
                            onClick={() => openUploadModal(type, item)}
                        >
                            <i className="bi bi-upload me-1"></i>
                            {isRejected ? "Re-Upload" : syllabusId ? "Replace" : "Upload"}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const getDepartmentName = () => {
        const department = departments.find(
            (item) =>
                item.code?.trim().toUpperCase() ===
                departmentCode?.trim().toUpperCase()
        );
        return department?.name || departmentCode;
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

    if (initialLoading) {
        return (
            <FacultyLayout>
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                        <div className="spinner-border text-primary"></div>
                        <p className="text-muted mt-3 mb-0">
                            Loading curriculum portal...
                        </p>
                    </div>
                </div>
            </FacultyLayout>
        );
    }

    return (
        <FacultyLayout>
            <div className="mb-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center">
                    <div>
                        <h2 className="fw-bold mb-1">Curriculum & Syllabus</h2>
                        <p className="text-muted mb-0">
                            View semester-wise curriculum, elective subjects, and syllabus files.
                        </p>
                    </div>
                    <div className="mt-3 mt-lg-0">
                        <span className="badge bg-primary-subtle text-primary px-3 py-2">
                            <i className="bi bi-person-badge me-1"></i>
                            {user?.role} - {user?.departmentCode}
                        </span>
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-12 col-md-4">
                            <label className="form-label fw-semibold">Regulation</label>
                            <select
                                className="form-select"
                                value={regulationCode}
                                onChange={handleRegulationChange}
                            >
                                <option value="">Select Regulation</option>
                                {regulations.map((regulation) => (
                                    <option
                                        key={regulation.code}
                                        value={regulation.code}
                                    >
                                        {regulation.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 col-md-4">
                            <label className="form-label fw-semibold">Department</label>
                            <select
                                className="form-select"
                                value={departmentCode}
                                onChange={handleDepartmentChange}
                            >
                                <option value="">Select Department</option>
                                {departments.map((department) => {
                                    const code = department.code?.trim().toUpperCase();
                                    const own = code === userDepartmentCode;
                                    return (
                                        <option
                                            key={department.code}
                                            value={department.code}
                                        >
                                            {department.name} ({department.code})
                                            {own ? " - My Department" : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div className="col-12 col-md-2">
                            <label className="form-label fw-semibold">Semester</label>
                            <select
                                className="form-select"
                                value={semester}
                                onChange={handleSemesterChange}
                            >
                                <option value="">Select Semester</option>
                                <option value="ALL">ALL</option>
                                {semesters.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 col-md-2">
                            <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={handleLoadCurriculum}
                                disabled={curriculumLoading}
                            >
                                {curriculumLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Loading
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-search me-2"></i>
                                        View
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* NOTICE BANNER */}
            {curricula.length > 0 && !isOwnDepartment && (
                <div className="alert alert-info border-0 shadow-sm">
                    <i className="bi bi-info-circle me-2"></i>
                    You are viewing the <strong className="mx-1">{getDepartmentName()}</strong> curriculum.
                    <span className="d-block mt-1">
                        <i className="bi bi-check2-circle text-success me-1"></i>
                        You can <strong>upload and replace Elective syllabi</strong> across departments. Core courses can only be uploaded by the department's own faculty.
                    </span>
                </div>
            )}

            {/* CURRICULUM TABLES */}
            {curricula.length > 0 && (
                <div>
                    {curricula.map((curriculum) => {
                        const { hasAltTrack, track1Items, track2Items } = getSemesterTracks(curriculum);

                        if (track1Items.length === 0 && track2Items.length === 0) {
                            return null;
                        }

                        // Track 1 totals
                        const track1Lecture = track1Items.reduce((s, x) => s + (Number(x.data.lecture) || 0), 0);
                        const track1Tutorial = track1Items.reduce((s, x) => s + (Number(x.data.tutorial) || 0), 0);
                        const track1Practical = track1Items.reduce((s, x) => s + (Number(x.data.practical) || 0), 0);
                        const track1Credits = track1Items.reduce((s, x) => s + getCredit(x.data), 0);

                        // Track 2 totals
                        const track2Lecture = track2Items.reduce((s, x) => s + (Number(x.data.lecture) || 0), 0);
                        const track2Tutorial = track2Items.reduce((s, x) => s + (Number(x.data.tutorial) || 0), 0);
                        const track2Practical = track2Items.reduce((s, x) => s + (Number(x.data.practical) || 0), 0);
                        const track2Credits = track2Items.reduce((s, x) => s + getCredit(x.data), 0);

                        return (
                            <div
                                key={curriculum.semester}
                                className="card border-0 shadow-sm mb-5"
                            >
                                <div className="card-header bg-primary text-white py-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="fw-bold mb-0">
                                            {getSemesterTitle(curriculum.semester)}
                                        </h5>
                                        {isOwnDepartment && (
                                            <span className="badge bg-success px-3 py-1">
                                                <i className="bi bi-pencil-square me-1"></i>
                                                Own Department
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-bordered align-middle mb-0 text-center">
                                        <thead className="table-primary text-dark fw-semibold">
                                            <tr>
                                                <th style={{ width: "65px" }} rowSpan="2">S.No.</th>
                                                <th style={{ minWidth: "150px" }} rowSpan="2">Course Code</th>
                                                <th style={{ minWidth: "350px" }} rowSpan="2" className="text-start ps-3">Course</th>
                                                <th colSpan="4">Hours / Week</th>
                                                <th style={{ minWidth: "180px" }} rowSpan="2">Syllabus</th>
                                            </tr>
                                            <tr>
                                                <th style={{ width: "60px" }}>L</th>
                                                <th style={{ width: "60px" }}>R</th>
                                                <th style={{ width: "60px" }}>P</th>
                                                <th style={{ width: "60px" }}>C</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* ================= TRACK 1 ================= */}
                                            {track1Items.map((entry, idx) => {
                                                const serial = idx + 1;

                                                if (entry.type === "course") {
                                                    const course = entry.data;
                                                    return (
                                                        <tr key={`t1-course-${course.id}`}>
                                                            <td>{serial}</td>
                                                            <td className="fw-semibold text-nowrap">
                                                                {course.courseCode || ""}
                                                            </td>
                                                            <td className="text-start ps-3 fw-semibold">
                                                                {course.courseName}
                                                            </td>
                                                            <td>{formatNumber(course.lecture)}</td>
                                                            <td>{formatNumber(course.tutorial)}</td>
                                                            <td>{formatNumber(course.practical)}</td>
                                                            <td className="fw-semibold">{formatNumber(getCredit(course))}</td>
                                                            <td>{renderSyllabusActions(course, "course")}</td>
                                                        </tr>
                                                    );
                                                }

                                                const group = entry.data;
                                                const groupSubjects = subjects[group.id] || [];
                                                const isExpanded = Boolean(expandedGroups[group.id]);

                                                return (
                                                    <React.Fragment key={`t1-group-${group.id}`}>
                                                        <tr>
                                                            <td>{serial}</td>
                                                            <td></td>
                                                            <td className="text-start ps-3">
                                                                <div
                                                                    className="d-flex align-items-center justify-content-between text-primary fw-semibold"
                                                                    style={{ cursor: "pointer" }}
                                                                    onClick={() => handleToggleElectiveGroup(group)}
                                                                >
                                                                    <span>{group.name}</span>
                                                                    <span className="badge bg-primary-subtle text-primary small">
                                                                        <i className={`bi bi-chevron-${isExpanded ? "up" : "down"} me-1`}></i>
                                                                        {isExpanded ? "Hide" : "View"}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td>{formatNumber(group.lecture)}</td>
                                                            <td>{formatNumber(group.tutorial)}</td>
                                                            <td>{formatNumber(group.practical)}</td>
                                                            <td className="fw-semibold">{formatNumber(getCredit(group))}</td>
                                                            <td>
                                                                <span className="badge bg-secondary-subtle text-secondary">
                                                                    Elective Slot
                                                                </span>
                                                            </td>
                                                        </tr>

                                                        {/* EXPANDABLE ELECTIVE SUBJECTS */}
                                                        {isExpanded && (
                                                            <tr className="bg-light">
                                                                <td colSpan="8" className="p-3">
                                                                    <div className="border rounded bg-white p-3 shadow-sm text-start">
                                                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                                                            <h6 className="fw-bold mb-0 text-primary">
                                                                                <i className="bi bi-list-ul me-2"></i>
                                                                                Subjects in {group.name}
                                                                            </h6>
                                                                            {subjectsLoading[group.id] && (
                                                                                <span className="spinner-border spinner-border-sm text-primary"></span>
                                                                            )}
                                                                        </div>
                                                                        {subjectsLoading[group.id] ? (
                                                                            <div className="text-muted small">
                                                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                                                Loading subjects...
                                                                            </div>
                                                                        ) : groupSubjects.length === 0 ? (
                                                                            <div className="alert alert-warning mb-0 small">
                                                                                No subjects available in this group.
                                                                            </div>
                                                                        ) : (
                                                                            <div className="table-responsive">
                                                                                <table className="table table-sm table-bordered align-middle mb-0 text-center">
                                                                                    <thead className="table-secondary">
                                                                                        <tr>
                                                                                            <th style={{ width: "50px" }}>#</th>
                                                                                            <th style={{ minWidth: "130px" }}>Subject Code</th>
                                                                                            <th style={{ minWidth: "260px" }} className="text-start ps-2">Subject Name</th>
                                                                                            <th style={{ width: "50px" }}>L</th>
                                                                                            <th style={{ width: "50px" }}>R</th>
                                                                                            <th style={{ width: "50px" }}>P</th>
                                                                                            <th style={{ width: "50px" }}>C</th>
                                                                                            <th style={{ minWidth: "170px" }}>Syllabus</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {groupSubjects.map((sub, sIdx) => (
                                                                                            <tr key={`group-${group.id}-sub-${sub.id}`}>
                                                                                                <td>{sIdx + 1}</td>
                                                                                                <td className="fw-semibold text-nowrap">{sub.courseCode || ""}</td>
                                                                                                <td className="text-start ps-2">{sub.courseName}</td>
                                                                                                <td>{formatNumber(sub.lecture)}</td>
                                                                                                <td>{formatNumber(sub.tutorial)}</td>
                                                                                                <td>{formatNumber(sub.practical)}</td>
                                                                                                <td className="fw-semibold">{formatNumber(getCredit(sub))}</td>
                                                                                                <td>{renderSyllabusActions(sub, "elective")}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
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
                                                <td colSpan="3" className="text-end pe-3">Total</td>
                                                <td>{formatNumber(track1Lecture)}</td>
                                                <td>{formatNumber(track1Tutorial)}</td>
                                                <td>{formatNumber(track1Practical)}</td>
                                                <td>{formatNumber(track1Credits)}</td>
                                                <td></td>
                                            </tr>

                                            {/* ================= ALTERNATIVE TRACK ("Or") ================= */}
                                            {hasAltTrack && (
                                                <>
                                                    <tr className="table-secondary text-center fw-bold">
                                                        <td colSpan="8" className="py-2 fs-6 text-uppercase">
                                                            Or
                                                        </td>
                                                    </tr>

                                                    {track2Items.map((entry, idx) => {
                                                        const course = entry.data;
                                                        return (
                                                            <tr key={`t2-course-${course.id}`}>
                                                                <td>{idx + 1}</td>
                                                                <td className="fw-semibold text-nowrap">
                                                                    {course.courseCode}
                                                                </td>
                                                                <td className="text-start ps-3 fw-semibold">
                                                                    {course.courseName}
                                                                </td>
                                                                <td>{formatNumber(course.lecture)}</td>
                                                                <td>{formatNumber(course.tutorial)}</td>
                                                                <td>{formatNumber(course.practical)}</td>
                                                                <td className="fw-semibold">{formatNumber(getCredit(course))}</td>
                                                                <td>{renderSyllabusActions(course, "course")}</td>
                                                            </tr>
                                                        );
                                                    })}

                                                    <tr className="table-light fw-bold">
                                                        <td colSpan="3" className="text-end pe-3">Total</td>
                                                        <td>{formatNumber(track2Lecture)}</td>
                                                        <td>{formatNumber(track2Tutorial)}</td>
                                                        <td>{formatNumber(track2Practical)}</td>
                                                        <td>{formatNumber(track2Credits)}</td>
                                                        <td></td>
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

            {/* ========================================================= */}
            {/* VIEW REJECTION REMARK MODAL                               */}
            {/* ========================================================= */}
            {remarksModal.open && remarksModal.item && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    role="dialog"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered" role="document">
                        <div className="modal-content border-0 shadow rounded-4">
                            <div className="modal-header border-0 pb-0">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="bg-danger-subtle text-danger rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
                                        <i className="bi bi-chat-right-text fs-5"></i>
                                    </div>
                                    <div>
                                        <h5 className="modal-title fw-bold text-danger mb-0">
                                            Rejection Remarks
                                        </h5>
                                        <small className="text-muted">
                                            {remarksModal.item.courseCode || ""} {remarksModal.item.courseName || remarksModal.item.subjectName}
                                        </small>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeRemarksModal}
                                ></button>
                            </div>

                            <div className="modal-body p-4">
                                {remarksModal.loading ? (
                                    <div className="text-center py-4 text-muted">
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Loading remarks...
                                    </div>
                                ) : (
                                    <>
                                        <div className="alert alert-danger border-0 bg-danger-subtle text-danger-emphasis mb-3">
                                            <div className="fw-semibold mb-1">
                                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                                Reason for Rejection:
                                            </div>
                                            <p className="mb-0 fs-6 ps-4">
                                                "{remarksModal.reason || "No explicit reason was provided."}"
                                            </p>
                                        </div>

                                        <div className="text-muted small d-flex justify-content-between">
                                            <span>
                                                Reviewed By: <strong>{remarksModal.reviewedBy}</strong>
                                            </span>
                                            {remarksModal.reviewedAt && (
                                                <span>
                                                    {new Date(remarksModal.reviewedAt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="modal-footer border-0 pt-0">
                                <button
                                    type="button"
                                    className="btn btn-light"
                                    onClick={closeRemarksModal}
                                >
                                    Close
                                </button>
                                {(remarksModal.type === "elective" ? canUploadElective : canUploadCourse) && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            const itemToUpload = remarksModal.item;
                                            const typeToUpload = remarksModal.type;
                                            closeRemarksModal();
                                            openUploadModal(typeToUpload, itemToUpload);
                                        }}
                                    >
                                        <i className="bi bi-upload me-1"></i>
                                        Re-Upload Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* UPLOAD SYLLABUS MODAL                                     */}
            {/* ========================================================= */}
            {uploadModal.open && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    role="dialog"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", zIndex: 1050 }}
                >
                    <div className="modal-dialog modal-dialog-centered" role="document">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-file-earmark-pdf text-danger me-2"></i>
                                    Upload Syllabus
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeUploadModal}
                                    disabled={uploading}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-info small">
                                    <i className="bi bi-info-circle me-2"></i>
                                    Only PDF files are allowed. Maximum file size is 10 MB.
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Subject</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={
                                            uploadModal.item?.courseName ||
                                            uploadModal.item?.subjectName ||
                                            "Selected Subject"
                                        }
                                        readOnly
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Select PDF File</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept="application/pdf,.pdf"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                    />
                                </div>
                                {selectedFile && (
                                    <div className="alert alert-success py-2">
                                        <i className="bi bi-check-circle me-2"></i>
                                        {selectedFile.name}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={closeUploadModal}
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleUploadSyllabus}
                                    disabled={uploading || !selectedFile}
                                >
                                    {uploading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-upload me-2"></i>
                                            Upload Syllabus
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </FacultyLayout>
    );
}

export default FacultyCurriculum;