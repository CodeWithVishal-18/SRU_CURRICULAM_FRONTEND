import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AdminLayout from "../../layouts/AdminLayout";
import { getAllRegulations } from "../../services/regulationService";
import { getAllDepartments } from "../../services/departmentService";
import { getAllUsers } from "../../services/userService";
import api from "../../services/api";
import {
    getSemesterCurriculum,
    getElectiveSubjects,
    uploadCourseSyllabus,
    uploadElectiveSubjectSyllabus,
    getCourseSyllabusStatus,
    getElectiveSubjectSyllabusStatus,
    getSyllabusFileUrl,
    updateSyllabusStatus,
} from "../../services/curriculumService";

function Curriculum() {
    // =========================================================
    // BASIC STATE
    // =========================================================
    const [regulations, setRegulations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [regulationCode, setRegulationCode] = useState("");
    const [departmentCode, setDepartmentCode] = useState("");
    const [semester, setSemester] = useState("");
    const [curricula, setCurricula] = useState([]);
    const [subjects, setSubjects] = useState({});
    const [expandedGroups, setExpandedGroups] = useState({});
    const [initialLoading, setInitialLoading] = useState(true);
    const [curriculumLoading, setCurriculumLoading] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState({});

    // =========================================================
    // ADMIN SYLLABUS MODAL STATE
    // =========================================================
    const [selectedSyllabusItem, setSelectedSyllabusItem] = useState(null);
    const [selectedSyllabusType, setSelectedSyllabusType] = useState("course");
    const [selectedSyllabusFile, setSelectedSyllabusFile] = useState(null);
    const [syllabusRemarks, setSyllabusRemarks] = useState("");
    const [syllabusUploading, setSyllabusUploading] = useState(false);
    const [syllabusStatusUpdating, setSyllabusStatusUpdating] = useState(false);
    const [syllabusDetailsLoading, setSyllabusDetailsLoading] = useState(false);
    const [activeSyllabusDetails, setActiveSyllabusDetails] = useState(null);

    // =========================================================
    // CONSTANTS
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
                const [regulationResponse, departmentResponse, userResponse] = await Promise.all([
                    getAllRegulations(),
                    getAllDepartments(),
                    getAllUsers().catch(() => ({ data: [] })),
                ]);
                setRegulations(regulationResponse?.data || []);
                setDepartments(departmentResponse?.data || []);
                setUsersList(userResponse?.data || []);
            } catch (error) {
                console.error("Initial data loading error:", error);
                toast.error("Failed to load regulations or departments");
            } finally {
                setInitialLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // =========================================================
    // CLEAR CURRICULUM
    // =========================================================
    const clearCurriculum = () => {
        setCurricula([]);
        setSubjects({});
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
    // ATTACH SYLLABUS STATUSES
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
                console.error(`Failed to load subjects for group ${group.id}:`, error);
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
                const allGroups = responses.flatMap((item) => item.electiveGroups || []);
                await loadElectiveSubjects(allGroups);
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
            const subjectsWithStatus = await attachElectiveSyllabusStatus(subjectList);
            setSubjects((previous) => ({
                ...previous,
                [groupId]: subjectsWithStatus,
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
    // HELPERS & NUMBER FORMATTING
    // =========================================================
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

    // =========================================================
    // TRACK SEPARATION (SEMESTER 7 "Or" SUPPORT)
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
    // SYLLABUS HELPERS
    // =========================================================
    const getSyllabusObject = (item) => (
        item?.syllabus ||
        item?.syllabusResponse ||
        item?.syllabusDetails ||
        null
    );

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
        if (["PENDING", "UNDER_REVIEW", "UPLOADED", "SUBMITTED"].includes(normalizedStatus)) {
            return "bg-warning-subtle text-warning-emphasis";
        }
        return "bg-secondary-subtle text-secondary";
    };

    const getStatusLabel = (status) => {
        const normalizedStatus = String(status || "").trim().toUpperCase();
        if (normalizedStatus === "NOT_UPLOADED") return "Not Uploaded";
        if (["UPLOADED", "SUBMITTED", "PENDING", "UNDER_REVIEW"].includes(normalizedStatus)) {
            return "Pending Review";
        }
        if (normalizedStatus === "APPROVED") return "Approved";
        if (normalizedStatus === "REJECTED" || normalizedStatus === "DECLINED") return "Rejected";
        return normalizedStatus
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    };

    // =========================================================
    // SYLLABUS ACTIONS (VIEW & MANAGE MODAL)
    // =========================================================
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

    const openSyllabusEditor = async (item, type = "course") => {
        setSelectedSyllabusItem(item);
        setSelectedSyllabusType(type);
        setSelectedSyllabusFile(null);
        setActiveSyllabusDetails(null);

        const syllabus = getSyllabusObject(item);
        setSyllabusRemarks(
            syllabus?.rejectionReason ||
            syllabus?.remarks ||
            item?.rejectionReason ||
            ""
        );

        const syllabusId = getSyllabusId(item);
        if (syllabusId) {
            try {
                setSyllabusDetailsLoading(true);
                const response = await api.get(`/api/syllabi/${syllabusId}`);
                const data = response?.data?.data || response?.data || {};
                setActiveSyllabusDetails(data);
                if (data.rejectionReason) {
                    setSyllabusRemarks(data.rejectionReason);
                }
            } catch (error) {
                console.warn("Unable to fetch detailed syllabus info:", error);
            } finally {
                setSyllabusDetailsLoading(false);
            }
        }
    };

    const closeSyllabusEditor = () => {
        if (syllabusUploading || syllabusStatusUpdating) return;
        setSelectedSyllabusItem(null);
        setSelectedSyllabusFile(null);
        setSyllabusRemarks("");
        setSelectedSyllabusType("course");
        setActiveSyllabusDetails(null);
    };

    const handleSyllabusFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            setSelectedSyllabusFile(null);
            return;
        }
        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        const fileName = file.name.toLowerCase();
        const validExtension =
            fileName.endsWith(".pdf") || fileName.endsWith(".doc") || fileName.endsWith(".docx");

        if (!allowedTypes.includes(file.type) && !validExtension) {
            toast.error("Only PDF, DOC, and DOCX files are allowed");
            event.target.value = "";
            setSelectedSyllabusFile(null);
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size must be less than 10 MB");
            event.target.value = "";
            setSelectedSyllabusFile(null);
            return;
        }
        setSelectedSyllabusFile(file);
    };

    const updateItemInState = (updatedItem) => {
        setCurricula((prev) =>
            prev.map((c) => ({
                ...c,
                courses: (c.courses || []).map((course) =>
                    Number(course.id) === Number(updatedItem.id)
                        ? { ...course, ...updatedItem }
                        : course
                ),
            }))
        );

        setSubjects((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((groupId) => {
                next[groupId] = (next[groupId] || []).map((sub) =>
                    Number(sub.id) === Number(updatedItem.id)
                        ? { ...sub, ...updatedItem }
                        : sub
                );
            });
            return next;
        });
    };

    const handleAdminSyllabusUpload = async () => {
        if (!selectedSyllabusFile) {
            toast.error("Please select a syllabus file");
            return;
        }
        if (!selectedSyllabusItem?.id) {
            toast.error("Unable to identify the selected item");
            return;
        }

        try {
            setSyllabusUploading(true);
            const response =
                selectedSyllabusType === "elective"
                    ? await uploadElectiveSubjectSyllabus(
                        selectedSyllabusItem.id,
                        selectedSyllabusFile
                    )
                    : await uploadCourseSyllabus(
                        selectedSyllabusItem.id,
                        selectedSyllabusFile
                    );

            const uploadedSyllabus = response?.data || response || {};
            const uploadedSyllabusId = uploadedSyllabus?.id || uploadedSyllabus?.syllabusId;
            const updatedItem = {
                ...selectedSyllabusItem,
                syllabusId: uploadedSyllabusId,
                syllabusStatus: uploadedSyllabus?.status || "UPLOADED",
                fileName: uploadedSyllabus?.originalFileName || selectedSyllabusFile.name,
                syllabus: uploadedSyllabus,
            };

            updateItemInState(updatedItem);
            setSelectedSyllabusItem(updatedItem);
            setSelectedSyllabusFile(null);
            setActiveSyllabusDetails(uploadedSyllabus);

            const input = document.getElementById("admin-syllabus-file");
            if (input) input.value = "";
            toast.success("Syllabus uploaded successfully (Pending Review)");
        } catch (error) {
            console.error("Admin syllabus upload error:", error);
            toast.error(error?.response?.data?.message || "Failed to upload syllabus");
        } finally {
            setSyllabusUploading(false);
        }
    };

    const handleAdminSyllabusStatus = async (status) => {
        const syllabusId = getSyllabusId(selectedSyllabusItem);
        if (!syllabusId) {
            toast.error("No uploaded syllabus found for this subject");
            return;
        }

        const rejectionReason = syllabusRemarks.trim();
        if (status === "REJECTED" && !rejectionReason) {
            toast.error("Please enter a rejection reason before rejecting");
            return;
        }

        try {
            setSyllabusStatusUpdating(true);

            if (status === "REJECTED") {
                if (!window.confirm("Reject and delete this uploaded syllabus file?")) {
                    setSyllabusStatusUpdating(false);
                    return;
                }
                await api.delete(`/api/syllabi/${syllabusId}/reject`, {
                    data: { rejectionReason },
                });

                const clearedItem = {
                    ...selectedSyllabusItem,
                    syllabusId: null,
                    syllabusStatus: "NOT_UPLOADED",
                    fileName: null,
                    syllabus: null,
                    rejectionReason,
                };

                updateItemInState(clearedItem);
                toast.success("Syllabus rejected and deleted successfully");
                closeSyllabusEditor();
                return;
            }

            const response = await updateSyllabusStatus(syllabusId, "APPROVED", "");
            const responseData = response?.data || response || {};
            const updatedItem = {
                ...selectedSyllabusItem,
                syllabusId,
                syllabusStatus: "APPROVED",
                syllabus: {
                    ...getSyllabusObject(selectedSyllabusItem),
                    ...responseData,
                    status: "APPROVED",
                    rejectionReason: null,
                },
            };

            updateItemInState(updatedItem);
            setSelectedSyllabusItem(updatedItem);
            toast.success("Syllabus approved successfully");
        } catch (error) {
            console.error("Syllabus status update error:", error);
            toast.error(
                error?.response?.data?.message ||
                `Failed to ${status === "REJECTED" ? "reject" : "approve"} syllabus`
            );
        } finally {
            setSyllabusStatusUpdating(false);
        }
    };

    const renderStatusBadge = (item) => {
        const status = getSyllabusStatus(item);
        return (
            <span className={`badge ${getStatusBadgeClass(status)} text-nowrap`}>
                {getStatusLabel(status)}
            </span>
        );
    };

    const renderActionButtons = (item, type) => {
        const syllabusId = getSyllabusId(item);

        return (
            <div className="d-flex justify-content-center align-items-center gap-1 text-nowrap">
                <button
                    type="button"
                    className="btn btn-sm btn-primary py-1 px-2"
                    onClick={() => openSyllabusEditor(item, type)}
                    title="Manage / Approve / Reject Syllabus"
                >
                    <i className="bi bi-gear me-1"></i>
                    Manage
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-primary py-1 px-2"
                    onClick={() => handleViewSyllabus(item)}
                    disabled={!syllabusId}
                    title={syllabusId ? "View Syllabus File" : "No syllabus uploaded"}
                >
                    <i className="bi bi-eye me-1"></i>
                    View
                </button>
            </div>
        );
    };

    // Helper to resolve uploader details from employeeId
    const getUploaderInfo = () => {
        const rawUploadedBy =
            activeSyllabusDetails?.uploadedBy ||
            selectedSyllabusItem?.uploadedBy ||
            getSyllabusObject(selectedSyllabusItem)?.uploadedBy ||
            null;

        if (!rawUploadedBy) return null;

        // Try to locate in user list by employeeId or name
        const matchedUser = usersList.find(
            (u) =>
                u.employeeId?.trim().toUpperCase() === rawUploadedBy.trim().toUpperCase() ||
                u.name?.trim().toLowerCase() === rawUploadedBy.trim().toLowerCase()
        );

        return {
            employeeId: matchedUser ? matchedUser.employeeId : rawUploadedBy,
            name: matchedUser ? matchedUser.name : rawUploadedBy,
            role: matchedUser ? matchedUser.role : null,
            department: matchedUser ? matchedUser.departmentCode : null,
            uploadedAt:
                activeSyllabusDetails?.uploadedAt ||
                selectedSyllabusItem?.uploadedAt ||
                getSyllabusObject(selectedSyllabusItem)?.uploadedAt,
        };
    };

    if (initialLoading) {
        return (
            <AdminLayout>
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                        <div className="spinner-border text-primary"></div>
                        <p className="text-muted mt-3 mb-0">Loading portal...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const uploader = getUploaderInfo();

    return (
        <AdminLayout>
            {/* PAGE HEADER */}
            <div className="mb-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center">
                    <div>
                        <h2 className="fw-bold mb-1">Curriculum Management</h2>
                        <p className="text-muted mb-0">
                            Inspect curriculum structure and review, approve, reject, or upload syllabus documents.
                        </p>
                    </div>
                    <div className="mt-3 mt-lg-0">
                        <span className="badge bg-primary-subtle text-primary px-3 py-2">
                            <i className="bi bi-shield-lock me-1"></i>
                            Admin Access
                        </span>
                    </div>
                </div>
            </div>

            {/* FILTER CARD */}
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
                                {regulations.map((reg) => (
                                    <option key={reg.code} value={reg.code}>
                                        {reg.code} {reg.startYear ? `(${reg.startYear})` : ""}
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
                                {departments.map((dept) => (
                                    <option key={dept.code} value={dept.code}>
                                        {dept.name} ({dept.code})
                                    </option>
                                ))}
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
                                        <small className="opacity-75">
                                            {regulationCode} - {departmentCode}
                                        </small>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table
                                        className="table table-bordered align-middle mb-0 text-center"
                                        style={{ tableLayout: "fixed", width: "100%" }}
                                    >
                                        <colgroup>
                                            <col style={{ width: "60px" }} />
                                            <col style={{ width: "160px" }} />
                                            <col />
                                            <col style={{ width: "55px" }} />
                                            <col style={{ width: "55px" }} />
                                            <col style={{ width: "55px" }} />
                                            <col style={{ width: "60px" }} />
                                            <col style={{ width: "140px" }} />
                                            <col style={{ width: "160px" }} />
                                        </colgroup>
                                        <thead className="table-primary text-dark fw-semibold">
                                            <tr>
                                                <th rowSpan="2">S.No.</th>
                                                <th rowSpan="2">Course Code</th>
                                                <th rowSpan="2" className="text-start ps-3">Course</th>
                                                <th colSpan="4">Hours / Week</th>
                                                <th rowSpan="2">Status</th>
                                                <th rowSpan="2">Action</th>
                                            </tr>
                                            <tr>
                                                <th>L</th>
                                                <th>R</th>
                                                <th>P</th>
                                                <th>C</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* ================= TRACK 1 ================= */}
                                            {track1Items.map((entry, idx) => {
                                                const serial = idx + 1;

                                                if (entry.type === "course") {
                                                    const course = entry.data;
                                                    return (
                                                        <tr key={`t1-course-${course.id}`} style={{ height: "54px" }}>
                                                            <td>{serial}</td>
                                                            <td className="fw-semibold text-truncate" title={course.courseCode}>
                                                                {course.courseCode || "-"}
                                                            </td>
                                                            <td className="text-start ps-3 fw-semibold text-truncate" title={course.courseName}>
                                                                {course.courseName}
                                                            </td>
                                                            <td>{formatNumber(course.lecture)}</td>
                                                            <td>{formatNumber(course.tutorial)}</td>
                                                            <td>{formatNumber(course.practical)}</td>
                                                            <td className="fw-semibold">{formatNumber(getCredit(course))}</td>
                                                            <td>{renderStatusBadge(course)}</td>
                                                            <td>{renderActionButtons(course, "course")}</td>
                                                        </tr>
                                                    );
                                                }

                                                const group = entry.data;
                                                const groupSubjects = subjects[group.id] || [];
                                                const isExpanded = Boolean(expandedGroups[group.id]);

                                                return (
                                                    <React.Fragment key={`t1-group-${group.id}`}>
                                                        <tr style={{ height: "54px" }}>
                                                            <td>{serial}</td>
                                                            <td>-</td>
                                                            <td className="text-start ps-3">
                                                                <div
                                                                    className="d-flex align-items-center justify-content-between text-primary fw-semibold"
                                                                    style={{ cursor: "pointer" }}
                                                                    onClick={() => handleToggleElectiveGroup(group)}
                                                                >
                                                                    <span className="text-truncate" title={group.name}>{group.name}</span>
                                                                    <span className="badge bg-primary-subtle text-primary small ms-2 text-nowrap">
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
                                                                <span className="badge bg-secondary-subtle text-secondary text-nowrap">
                                                                    Elective Slot
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-secondary py-1 px-2 text-nowrap"
                                                                    onClick={() => handleToggleElectiveGroup(group)}
                                                                >
                                                                    {isExpanded ? "Collapse" : "Subjects"}
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* EXPANDABLE ELECTIVE SUBJECTS */}
                                                        {isExpanded && (
                                                            <tr className="bg-light">
                                                                <td colSpan="9" className="p-3">
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
                                                                                <table
                                                                                    className="table table-sm table-bordered align-middle mb-0 text-center"
                                                                                    style={{ tableLayout: "fixed", width: "100%" }}
                                                                                >
                                                                                    <colgroup>
                                                                                        <col style={{ width: "60px" }} />
                                                                                        <col style={{ width: "160px" }} />
                                                                                        <col />
                                                                                        <col style={{ width: "55px" }} />
                                                                                        <col style={{ width: "55px" }} />
                                                                                        <col style={{ width: "55px" }} />
                                                                                        <col style={{ width: "60px" }} />
                                                                                        <col style={{ width: "140px" }} />
                                                                                        <col style={{ width: "160px" }} />
                                                                                    </colgroup>
                                                                                    <thead className="table-secondary">
                                                                                        <tr>
                                                                                            <th>#</th>
                                                                                            <th>Subject Code</th>
                                                                                            <th className="text-start ps-2">Subject Name</th>
                                                                                            <th>L</th>
                                                                                            <th>R</th>
                                                                                            <th>P</th>
                                                                                            <th>C</th>
                                                                                            <th>Status</th>
                                                                                            <th>Action</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {groupSubjects.map((sub, sIdx) => (
                                                                                            <tr key={`group-${group.id}-sub-${sub.id}`} style={{ height: "48px" }}>
                                                                                                <td>{sIdx + 1}</td>
                                                                                                <td className="fw-semibold text-truncate" title={sub.courseCode}>
                                                                                                    {sub.courseCode || "-"}
                                                                                                </td>
                                                                                                <td className="text-start ps-2 text-truncate" title={sub.courseName}>
                                                                                                    {sub.courseName}
                                                                                                </td>
                                                                                                <td>{formatNumber(sub.lecture)}</td>
                                                                                                <td>{formatNumber(sub.tutorial)}</td>
                                                                                                <td>{formatNumber(sub.practical)}</td>
                                                                                                <td className="fw-semibold">{formatNumber(getCredit(sub))}</td>
                                                                                                <td>{renderStatusBadge(sub)}</td>
                                                                                                <td>{renderActionButtons(sub, "elective")}</td>
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
                                            <tr className="table-light fw-bold" style={{ height: "48px" }}>
                                                <td colSpan="3" className="text-end pe-3">Total</td>
                                                <td>{formatNumber(track1Lecture)}</td>
                                                <td>{formatNumber(track1Tutorial)}</td>
                                                <td>{formatNumber(track1Practical)}</td>
                                                <td>{formatNumber(track1Credits)}</td>
                                                <td></td>
                                                <td></td>
                                            </tr>

                                            {/* ================= ALTERNATIVE TRACK ("Or") ================= */}
                                            {hasAltTrack && (
                                                <>
                                                    <tr className="table-secondary text-center fw-bold" style={{ height: "40px" }}>
                                                        <td colSpan="9" className="py-2 fs-6 text-uppercase">
                                                            Or
                                                        </td>
                                                    </tr>

                                                    {track2Items.map((entry, idx) => {
                                                        const course = entry.data;
                                                        return (
                                                            <tr key={`t2-course-${course.id}`} style={{ height: "54px" }}>
                                                                <td>{idx + 1}</td>
                                                                <td className="fw-semibold text-truncate" title={course.courseCode}>
                                                                    {course.courseCode}
                                                                </td>
                                                                <td className="text-start ps-3 fw-semibold text-truncate" title={course.courseName}>
                                                                    {course.courseName}
                                                                </td>
                                                                <td>{formatNumber(course.lecture)}</td>
                                                                <td>{formatNumber(course.tutorial)}</td>
                                                                <td>{formatNumber(course.practical)}</td>
                                                                <td className="fw-semibold">{formatNumber(getCredit(course))}</td>
                                                                <td>{renderStatusBadge(course)}</td>
                                                                <td>{renderActionButtons(course, "course")}</td>
                                                            </tr>
                                                        );
                                                    })}

                                                    <tr className="table-light fw-bold" style={{ height: "48px" }}>
                                                        <td colSpan="3" className="text-end pe-3">Total</td>
                                                        <td>{formatNumber(track2Lecture)}</td>
                                                        <td>{formatNumber(track2Tutorial)}</td>
                                                        <td>{formatNumber(track2Practical)}</td>
                                                        <td>{formatNumber(track2Credits)}</td>
                                                        <td></td>
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
            {/* ADMIN MANAGE SYLLABUS MODAL                               */}
            {/* ========================================================= */}
            {selectedSyllabusItem && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    role="dialog"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header">
                                <div>
                                    <h5 className="modal-title fw-bold mb-1">Manage Syllabus</h5>
                                    <div className="small text-muted">
                                        {selectedSyllabusItem.courseCode || ""} {selectedSyllabusItem.courseCode ? " - " : ""}
                                        {selectedSyllabusItem.courseName}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeSyllabusEditor}
                                    disabled={syllabusUploading || syllabusStatusUpdating}
                                ></button>
                            </div>

                            <div className="modal-body p-4">
                                {/* CURRENT STATUS */}
                                <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 mb-3">
                                    <div>
                                        <small className="text-muted d-block">Current Status</small>
                                        <span className={`badge ${getStatusBadgeClass(getSyllabusStatus(selectedSyllabusItem))}`}>
                                            {getStatusLabel(getSyllabusStatus(selectedSyllabusItem))}
                                        </span>
                                    </div>
                                    {selectedSyllabusItem.fileName && (
                                        <div className="text-end">
                                            <small className="text-muted d-block">File Name</small>
                                            <span className="fw-semibold small">{selectedSyllabusItem.fileName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* UPLOADER AUDIT INFORMATION CARD */}
                                {syllabusDetailsLoading ? (
                                    <div className="p-3 text-center text-muted small bg-light rounded-3 mb-3">
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Loading uploader information...
                                    </div>
                                ) : uploader ? (
                                    <div className="border border-info-subtle bg-info-subtle rounded-3 p-3 mb-4">
                                        <div className="d-flex align-items-center gap-2 mb-2 text-info-emphasis">
                                            <i className="bi bi-person-check-fill fs-5"></i>
                                            <h6 className="fw-bold mb-0">Uploader Details</h6>
                                        </div>
                                        <div className="row g-2 small text-dark">
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Uploaded By: </span>
                                                <strong>{uploader.name}</strong>
                                                {uploader.role && (
                                                    <span className="badge bg-primary ms-2">{uploader.role}</span>
                                                )}
                                            </div>
                                            <div className="col-12 col-sm-6">
                                                <span className="text-muted">Employee ID: </span>
                                                <strong className="badge bg-dark-subtle text-dark px-2">{uploader.employeeId}</strong>
                                            </div>
                                            {uploader.department && (
                                                <div className="col-12 col-sm-6">
                                                    <span className="text-muted">Department: </span>
                                                    <strong>{uploader.department}</strong>
                                                </div>
                                            )}
                                            {uploader.uploadedAt && (
                                                <div className="col-12 col-sm-6">
                                                    <span className="text-muted">Uploaded At: </span>
                                                    <span>{new Date(uploader.uploadedAt).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary py-2 small mb-4">
                                        <i className="bi bi-info-circle me-1"></i>
                                        No uploader information found. Syllabus is not yet uploaded.
                                    </div>
                                )}

                                {/* UPLOAD / REPLACE */}
                                <div className="mb-4">
                                    <label className="form-label fw-semibold">
                                        {getSyllabusId(selectedSyllabusItem) ? "Replace Syllabus File" : "Upload Syllabus File"}
                                    </label>
                                    <input
                                        id="admin-syllabus-file"
                                        type="file"
                                        className="form-control"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleSyllabusFileChange}
                                        disabled={syllabusUploading || syllabusStatusUpdating}
                                    />
                                    <div className="form-text small">Accepted formats: PDF, DOC, DOCX. Max file size: 10 MB.</div>

                                    {selectedSyllabusFile && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm mt-3"
                                            onClick={handleAdminSyllabusUpload}
                                            disabled={syllabusUploading || syllabusStatusUpdating}
                                        >
                                            {syllabusUploading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-1"></span>
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-upload me-1"></i>
                                                    Confirm & Upload
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                <hr />

                                {/* REVIEW REMARKS / REJECTION REASON */}
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">
                                        Rejection Reason / Reviewer Comment
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Please provide comments or a required rejection reason..."
                                        value={syllabusRemarks}
                                        onChange={(e) => setSyllabusRemarks(e.target.value)}
                                        disabled={syllabusUploading || syllabusStatusUpdating}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={closeSyllabusEditor}
                                    disabled={syllabusUploading || syllabusStatusUpdating}
                                >
                                    Cancel
                                </button>

                                {/* REJECT BUTTON */}
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => handleAdminSyllabusStatus("REJECTED")}
                                    disabled={
                                        !getSyllabusId(selectedSyllabusItem) ||
                                        syllabusUploading ||
                                        syllabusStatusUpdating
                                    }
                                >
                                    {syllabusStatusUpdating ? (
                                        <span className="spinner-border spinner-border-sm me-1"></span>
                                    ) : (
                                        <i className="bi bi-x-circle me-1"></i>
                                    )}
                                    Reject & Delete
                                </button>

                                {/* APPROVE BUTTON */}
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => handleAdminSyllabusStatus("APPROVED")}
                                    disabled={
                                        !getSyllabusId(selectedSyllabusItem) ||
                                        syllabusUploading ||
                                        syllabusStatusUpdating
                                    }
                                >
                                    {syllabusStatusUpdating ? (
                                        <span className="spinner-border spinner-border-sm me-1"></span>
                                    ) : (
                                        <i className="bi bi-check-circle me-1"></i>
                                    )}
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default Curriculum;