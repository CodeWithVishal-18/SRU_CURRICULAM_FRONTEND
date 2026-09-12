import { useEffect, useState } from "react";
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

    /*
     * {
     *   groupId: [subjectId1, subjectId2]
     * }
     */
    const [selections, setSelections] = useState({});

    /*
     * {
     *   groupId: [subject1, subject2]
     * }
     */
    const [subjects, setSubjects] = useState({});

    const [initialLoading, setInitialLoading] = useState(true);
    const [curriculumLoading, setCurriculumLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [subjectsLoading, setSubjectsLoading] = useState({});

    // =========================================================
    // NEW SYLLABUS STATES
    // =========================================================

    /*
     * {
     *   groupId: true / false
     * }
     */
    const [expandedGroups, setExpandedGroups] = useState({});

    const [uploadModal, setUploadModal] = useState({
        open: false,
        type: "",
        item: null,
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // =========================================================
    // USER DEPARTMENT
    // =========================================================

    const userDepartmentCode = user?.departmentCode
        ?.trim()
        .toUpperCase();

    const canEdit =
        Boolean(
            user &&
            (user.role === "HOD" || user.role === "DEAN") &&
            userDepartmentCode &&
            departmentCode &&
            userDepartmentCode ===
            departmentCode.trim().toUpperCase()
        );

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

                const [
                    regulationResponse,
                    departmentResponse,
                ] = await Promise.all([
                    getAllRegulations(),
                    getAllDepartments(),
                ]);

                setRegulations(
                    regulationResponse?.data || []
                );

                setDepartments(
                    departmentResponse?.data || []
                );

                if (userDepartmentCode) {
                    setDepartmentCode(userDepartmentCode);
                }
            } catch (error) {
                console.error(
                    "Failed to load initial data:",
                    error
                );

                toast.error(
                    "Failed to load regulations or departments"
                );
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

    // =========================================================
    // REGULATION CHANGE
    // =========================================================

    const handleRegulationChange = (event) => {
        setRegulationCode(event.target.value);
        clearCurriculum();
    };

    // =========================================================
    // DEPARTMENT CHANGE
    // =========================================================

    const handleDepartmentChange = (event) => {
        setDepartmentCode(event.target.value);
        clearCurriculum();
    };

    // =========================================================
    // SEMESTER CHANGE
    // =========================================================

    const handleSemesterChange = (event) => {
        setSemester(event.target.value);
        clearCurriculum();
    };

    // =========================================================
    // NORMALIZE CURRICULUM RESPONSE
    // =========================================================

    const normalizeCurriculumResponse = (
        response,
        semesterNumber
    ) => {
        /*
         * getSemesterCurriculum() currently returns response.data.
         * This also supports an Axios response object in case
         * the service is changed later.
         */

        const data = response?.data || response || {};

        return {
            semester: semesterNumber,
            courses: data?.courses || [],
            electiveGroups:
                data?.electiveGroups ||
                data?.electives ||
                [],
        };
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

            // =================================================
            // LOAD ALL SEMESTERS
            // =================================================

            if (semester === "ALL") {
                const semesterNumbers = [
                    1, 2, 3, 4, 5, 6, 7, 8,
                ];

                const responses = await Promise.all(
                    semesterNumbers.map(async (sem) => {
                        try {
                            const response =
                                await getSemesterCurriculum(
                                    regulationCode,
                                    departmentCode,
                                    sem
                                );

                            return normalizeCurriculumResponse(
                                response,
                                sem
                            );
                        } catch (error) {
                            console.error(
                                `Failed to load Semester ${sem}:`,
                                error
                            );

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

            // =================================================
            // LOAD ONE SEMESTER
            // =================================================

            const sem = Number(semester);

            const response = await getSemesterCurriculum(
                regulationCode,
                departmentCode,
                sem
            );

            const singleCurriculum =
                normalizeCurriculumResponse(response, sem);

            setCurricula([singleCurriculum]);

            const groups =
                singleCurriculum.electiveGroups || [];

            await loadElectiveSubjects(groups);

            const existingSelections = {};

            groups.forEach((group) => {
                existingSelections[group.id] = (
                    group.selectedSubjects || []
                ).map((subject) => Number(subject.id));
            });

            setSelections(existingSelections);
        } catch (error) {
            console.error(
                "Failed to load curriculum:",
                error
            );

            toast.error(
                error?.response?.data?.message ||
                "Failed to load curriculum"
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

                const response = await getElectiveSubjects(
                    group.id
                );

                const data =
                    response?.data ||
                    response?.subjects ||
                    response ||
                    [];

                subjectMap[group.id] = Array.isArray(data)
                    ? data
                    : [];
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

        setSubjects(subjectMap);
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

        /*
         * Subjects are already loaded during curriculum loading.
         * This fallback loads them if they are not available.
         */

        if (subjects[groupId]) {
            return;
        }

        try {
            setSubjectsLoading((previous) => ({
                ...previous,
                [groupId]: true,
            }));

            const response = await getElectiveSubjects(
                groupId
            );

            const data =
                response?.data ||
                response?.subjects ||
                response ||
                [];

            setSubjects((previous) => ({
                ...previous,
                [groupId]: Array.isArray(data) ? data : [],
            }));
        } catch (error) {
            console.error(
                "Failed to load elective subjects:",
                error
            );

            toast.error(
                "Failed to load elective subjects"
            );
        } finally {
            setSubjectsLoading((previous) => ({
                ...previous,
                [groupId]: false,
            }));
        }
    };

    // =========================================================
    // OPEN ELECTIVE CHECK
    // =========================================================

    const isOpenElective = (group) => {
        const type = String(group?.electiveType || "")
            .trim()
            .toUpperCase()
            .replaceAll("-", "_")
            .replaceAll(" ", "_");

        return (
            type === "OPEN_ELECTIVE" ||
            type.includes("OPEN_ELECTIVE")
        );
    };

    // =========================================================
    // EXCLUDED COURSE CHECK
    // =========================================================

    const isExcludedCourse = (course) => {
        const code = String(course?.courseCode || "")
            .trim()
            .toUpperCase();

        return (
            code.includes("HN") ||
            code.includes("MN")
        );
    };

    // =========================================================
    // FORMAT NUMBER
    // =========================================================

    const formatNumber = (value) => {
        const number = Number(value) || 0;

        return Number.isInteger(number)
            ? number
            : Number(number.toFixed(2));
    };

    // =========================================================
    // GET CREDIT
    // =========================================================

    const getCredit = (item) => {
        const stored = Number(item?.credits);

        if (
            Number.isFinite(stored) &&
            stored > 0
        ) {
            return stored;
        }

        const lecture = Number(item?.lecture) || 0;
        const tutorial = Number(item?.tutorial) || 0;
        const practical = Number(item?.practical) || 0;

        if (
            lecture === 0 &&
            tutorial === 0 &&
            practical === 0
        ) {
            return 0;
        }

        return (
            lecture +
            0.5 * tutorial +
            0.5 * practical
        );
    };

    // =========================================================
    // SUBJECT CHANGE
    // =========================================================

    const handleSubjectChange = (
        groupId,
        event
    ) => {
        if (!canEdit) {
            return;
        }

        const selectedValues = Array.from(
            event.target.selectedOptions
        ).map((option) => Number(option.value));

        setSelections((previous) => ({
            ...previous,
            [groupId]: selectedValues,
        }));
    };

    // =========================================================
    // SAVE ELECTIVE SELECTIONS
    // =========================================================

    const handleSave = async () => {
        if (!canEdit) {
            toast.error(
                "You can only modify electives for your own department"
            );
            return;
        }

        if (!regulationCode || !departmentCode) {
            toast.error(
                "Please select regulation and department"
            );
            return;
        }

        const requests = [];

        curricula.forEach((curriculum) => {
            const selectionList = [];

            const openGroups = (
                curriculum.electiveGroups || []
            ).filter(isOpenElective);

            openGroups.forEach((group) => {
                const selectedIds =
                    selections[group.id] || [];

                selectedIds.forEach((subjectId) => {
                    selectionList.push({
                        electiveGroupId: group.id,
                        subjectId,
                    });
                });
            });

            if (openGroups.length > 0) {
                requests.push(
                    selectElectives(
                        regulationCode,
                        departmentCode,
                        curriculum.semester,
                        {
                            selections: selectionList,
                        }
                    )
                );
            }
        });

        if (requests.length === 0) {
            toast.error(
                "No Open Elective groups are available"
            );
            return;
        }

        try {
            setSaving(true);

            await Promise.all(requests);

            toast.success(
                "Open Elective selections saved successfully"
            );

            await handleLoadCurriculum();
        } catch (error) {
            console.error(
                "Failed to save electives:",
                error
            );

            toast.error(
                error?.response?.data?.message ||
                "Failed to update elective selections"
            );
        } finally {
            setSaving(false);
        }
    };

    // =========================================================
    // SYLLABUS HELPERS
    // =========================================================

    const getSyllabusObject = (item) => {
        /*
         * Supports different possible DTO property names:
         *
         * item.syllabus
         * item.syllabusResponse
         * item.syllabusDetails
         */

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
            item?.syllabusId ||
            null
        );
    };

    const getSyllabusStatus = (item) => {
        const syllabus = getSyllabusObject(item);

        return (
            syllabus?.status ||
            item?.syllabusStatus ||
            item?.status ||
            "NOT_UPLOADED"
        );
    };

    const getStatusBadgeClass = (status) => {
        const normalizedStatus = String(status || "")
            .trim()
            .toUpperCase();

        if (
            normalizedStatus === "APPROVED" ||
            normalizedStatus === "ACCEPTED"
        ) {
            return "bg-success-subtle text-success";
        }

        if (
            normalizedStatus === "REJECTED" ||
            normalizedStatus === "DECLINED"
        ) {
            return "bg-danger-subtle text-danger";
        }

        if (
            normalizedStatus === "PENDING" ||
            normalizedStatus === "UNDER_REVIEW"
        ) {
            return "bg-warning-subtle text-warning-emphasis";
        }

        if (
            normalizedStatus === "UPLOADED" ||
            normalizedStatus === "SUBMITTED"
        ) {
            return "bg-info-subtle text-info";
        }

        return "bg-secondary-subtle text-secondary";
    };

    const getStatusLabel = (status) => {
        const normalizedStatus = String(status || "")
            .trim()
            .toUpperCase();

        if (normalizedStatus === "NOT_UPLOADED") {
            return "Not Uploaded";
        }

        if (normalizedStatus === "UPLOADED") {
            return "Uploaded";
        }

        if (normalizedStatus === "SUBMITTED") {
            return "Submitted";
        }

        if (normalizedStatus === "PENDING") {
            return "Pending Review";
        }

        if (normalizedStatus === "UNDER_REVIEW") {
            return "Under Review";
        }

        if (normalizedStatus === "APPROVED") {
            return "Approved";
        }

        if (
            normalizedStatus === "REJECTED" ||
            normalizedStatus === "DECLINED"
        ) {
            return "Rejected";
        }

        return normalizedStatus
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    };

    // =========================================================
    // OPEN UPLOAD MODAL
    // =========================================================

    const openUploadModal = (type, item) => {
        setSelectedFile(null);

        setUploadModal({
            open: true,
            type,
            item,
        });
    };

    // =========================================================
    // CLOSE UPLOAD MODAL
    // =========================================================

    const closeUploadModal = () => {
        if (uploading) {
            return;
        }

        setUploadModal({
            open: false,
            type: "",
            item: null,
        });

        setSelectedFile(null);
    };

    // =========================================================
    // FILE CHANGE
    // =========================================================

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            setSelectedFile(null);
            return;
        }

        const maxSize = 10 * 1024 * 1024;

        if (file.size > maxSize) {
            toast.error(
                "File size must not exceed 10 MB"
            );

            event.target.value = "";
            setSelectedFile(null);
            return;
        }

        const isPdf =
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            toast.error(
                "Please upload a PDF file only"
            );

            event.target.value = "";
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
    };

    // =========================================================
    // UPLOAD SYLLABUS
    // =========================================================

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

            /*
             * Some APIs return:
             * {
             *   id: 1,
             *   status: "PENDING"
             * }
             *
             * Others return:
             * {
             *   data: {
             *      id: 1,
             *      status: "PENDING"
             *   }
             * }
             */

            const uploadedSyllabus =
                uploadResponse?.data || uploadResponse || {};

            const uploadedSyllabusId =
                uploadedSyllabus?.id ||
                uploadedSyllabus?.syllabusId ||
                null;

            const uploadedStatus =
                uploadedSyllabus?.status || "UPLOADED";

            /*
             * Update the current curriculum state immediately.
             * Do not call handleLoadCurriculum() here because that
             * endpoint may not return syllabus details.
             */

            setCurricula((previousCurricula) =>
                previousCurricula.map((curriculum) => ({
                    ...curriculum,

                    courses: (curriculum.courses || []).map(
                        (course) => {
                            if (
                                uploadModal.type === "course" &&
                                Number(course.id) === Number(item.id)
                            ) {
                                return {
                                    ...course,
                                    syllabusId:
                                        uploadedSyllabusId ||
                                        course.syllabusId,
                                    syllabusStatus: uploadedStatus,
                                    syllabus:
                                        uploadedSyllabusId
                                            ? uploadedSyllabus
                                            : course.syllabus,
                                };
                            }

                            return course;
                        }
                    ),

                    electiveGroups: (
                        curriculum.electiveGroups || []
                    ).map((group) => ({
                        ...group,

                        selectedSubjects: (
                            group.selectedSubjects || []
                        ),

                        // The actual subject list is stored separately
                        // in the subjects state, so groups remain unchanged.
                    })),
                }))
            );

            /*
             * Update elective subject state separately because
             * elective subjects are stored in the subjects object.
             */

            if (uploadModal.type === "elective") {
                setSubjects((previousSubjects) => {
                    const updatedSubjects = {
                        ...previousSubjects,
                    };

                    Object.keys(updatedSubjects).forEach((groupId) => {
                        updatedSubjects[groupId] = (
                            updatedSubjects[groupId] || []
                        ).map((subject) => {
                            if (
                                Number(subject.id) === Number(item.id)
                            ) {
                                return {
                                    ...subject,
                                    syllabusId:
                                        uploadedSyllabusId ||
                                        subject.syllabusId,
                                    syllabusStatus: uploadedStatus,
                                    syllabus:
                                        uploadedSyllabusId
                                            ? uploadedSyllabus
                                            : subject.syllabus,
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
            console.error(
                "Syllabus upload failed:",
                error
            );

            toast.error(
                error?.response?.data?.message ||
                "Failed to upload syllabus"
            );
        } finally {
            setUploading(false);
        }
    };

    // =========================================================
    // VIEW SYLLABUS FILE
    // =========================================================

    const handleViewSyllabus = async (item) => {
        const syllabusId = getSyllabusId(item);

        if (!syllabusId) {
            toast.error(
                "Syllabus file is not available"
            );
            return;
        }

        try {
            const fileUrl =
                getSyllabusFileUrl(syllabusId);

            /*
             * Use Axios instead of window.open directly.
             * This allows the configured JWT interceptor
             * to attach the authorization token.
             */

            const response = await api.get(fileUrl, {
                responseType: "blob",
            });

            const blobUrl = window.URL.createObjectURL(
                response.data
            );

            window.open(
                blobUrl,
                "_blank",
                "noopener,noreferrer"
            );

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
            }, 60000);
        } catch (error) {
            console.error(
                "Failed to open syllabus:",
                error
            );

            toast.error(
                error?.response?.data?.message ||
                "Unable to open syllabus file"
            );
        }
    };

    // =========================================================
    // SYLLABUS ACTIONS
    // =========================================================

    const renderSyllabusActions = (
        item,
        type
    ) => {
        const syllabusId = getSyllabusId(item);
        const status = getSyllabusStatus(item);

        return (
            <div className="d-flex flex-column align-items-center gap-2">
                <span
                    className={`badge ${getStatusBadgeClass(
                        status
                    )}`}
                >
                    {getStatusLabel(status)}
                </span>

                <div className="d-flex flex-wrap justify-content-center gap-2">
                    {syllabusId && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() =>
                                handleViewSyllabus(item)
                            }
                        >
                            <i className="bi bi-eye me-1"></i>
                            View
                        </button>
                    )}

                    {canEdit && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() =>
                                openUploadModal(type, item)
                            }
                        >
                            <i className="bi bi-upload me-1"></i>
                            {syllabusId
                                ? "Replace"
                                : "Upload"}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // =========================================================
    // TOTAL FOR SEMESTER
    // =========================================================

    const totalForSemester = (curriculum) => {
        const courses = (
            curriculum.courses || []
        ).filter(
            (course) => !isExcludedCourse(course)
        );

        const electives =
            curriculum.electiveGroups || [];

        const lecture = courses.reduce(
            (sum, course) =>
                sum + (Number(course.lecture) || 0),
            0
        );

        const tutorial = courses.reduce(
            (sum, course) =>
                sum + (Number(course.tutorial) || 0),
            0
        );

        const practical = courses.reduce(
            (sum, course) =>
                sum + (Number(course.practical) || 0),
            0
        );

        const credits = courses.reduce(
            (sum, course) =>
                sum + getCredit(course),
            0
        );

        const selectedElectives = electives.filter(
            (group) => {
                if (isOpenElective(group)) {
                    return (
                        (selections[group.id] || [])
                            .length > 0
                    );
                }

                return true;
            }
        );

        const finalLecture =
            lecture +
            selectedElectives.reduce(
                (sum, group) =>
                    sum +
                    (Number(group.lecture) || 0),
                0
            );

        const finalTutorial =
            tutorial +
            selectedElectives.reduce(
                (sum, group) =>
                    sum +
                    (Number(group.tutorial) || 0),
                0
            );

        const finalPractical =
            practical +
            selectedElectives.reduce(
                (sum, group) =>
                    sum +
                    (Number(group.practical) || 0),
                0
            );

        const finalCredits =
            credits +
            selectedElectives.reduce(
                (sum, group) =>
                    sum + getCredit(group),
                0
            );

        return {
            lecture: finalLecture,
            tutorial: finalTutorial,
            practical: finalPractical,
            credits: finalCredits,
        };
    };

    // =========================================================
    // DEPARTMENT NAME
    // =========================================================

    const getDepartmentName = () => {
        const department = departments.find(
            (item) =>
                item.code
                    ?.trim()
                    .toUpperCase() ===
                departmentCode
                    ?.trim()
                    .toUpperCase()
        );

        return department?.name || departmentCode;
    };

    // =========================================================
    // SEMESTER TITLE
    // =========================================================

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

        return (
            titles[semesterNumber] ||
            `Semester ${semesterNumber}`
        );
    };

    // =========================================================
    // LOADING SCREEN
    // =========================================================

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

    // =========================================================
    // UI
    // =========================================================

    return (
        <FacultyLayout>
            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center">
                    <div>
                        <h2 className="fw-bold mb-1">
                            Curriculum & Syllabus
                        </h2>

                        <p className="text-muted mb-0">
                            View semester-wise curriculum,
                            elective subjects, and syllabus files.
                        </p>
                    </div>

                    <div className="mt-3 mt-lg-0">
                        <span className="badge bg-primary-subtle text-primary px-3 py-2">
                            <i className="bi bi-person-badge me-1"></i>
                            {user?.role}
                            {" • "}
                            {user?.departmentCode}
                        </span>
                    </div>
                </div>
            </div>

            {/* =================================================
                FILTER
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        {/* REGULATION */}

                        <div className="col-12 col-md-4">
                            <label className="form-label fw-semibold">
                                Regulation
                            </label>

                            <select
                                className="form-select"
                                value={regulationCode}
                                onChange={
                                    handleRegulationChange
                                }
                            >
                                <option value="">
                                    Select Regulation
                                </option>

                                {regulations.map(
                                    (regulation) => (
                                        <option
                                            key={
                                                regulation.code
                                            }
                                            value={
                                                regulation.code
                                            }
                                        >
                                            {regulation.code}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {/* DEPARTMENT */}

                        <div className="col-12 col-md-4">
                            <label className="form-label fw-semibold">
                                Department
                            </label>

                            <select
                                className="form-select"
                                value={departmentCode}
                                onChange={
                                    handleDepartmentChange
                                }
                            >
                                <option value="">
                                    Select Department
                                </option>

                                {departments.map(
                                    (department) => {
                                        const code =
                                            department.code
                                                ?.trim()
                                                .toUpperCase();

                                        const own =
                                            code ===
                                            userDepartmentCode;

                                        return (
                                            <option
                                                key={
                                                    department.code
                                                }
                                                value={
                                                    department.code
                                                }
                                            >
                                                {department.name}
                                                {" ("}
                                                {department.code}
                                                {")"}
                                                {own
                                                    ? " - My Department"
                                                    : ""}
                                            </option>
                                        );
                                    }
                                )}
                            </select>
                        </div>

                        {/* SEMESTER */}

                        <div className="col-12 col-md-2">
                            <label className="form-label fw-semibold">
                                Semester
                            </label>

                            <select
                                className="form-select"
                                value={semester}
                                onChange={
                                    handleSemesterChange
                                }
                            >
                                <option value="">
                                    Select Semester
                                </option>

                                <option value="ALL">
                                    ALL
                                </option>

                                {semesters.map((item) => (
                                    <option
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* VIEW BUTTON */}

                        <div className="col-12 col-md-2">
                            <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={
                                    handleLoadCurriculum
                                }
                                disabled={
                                    curriculumLoading
                                }
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

            {/* =================================================
                VIEW ONLY NOTICE
            ================================================= */}

            {curricula.length > 0 && !canEdit && (
                <div className="alert alert-info border-0 shadow-sm">
                    <i className="bi bi-info-circle me-2"></i>

                    You are viewing the
                    <strong className="mx-1">
                        {getDepartmentName()}
                    </strong>
                    curriculum.

                    <span className="d-block mt-1">
                        <i className="bi bi-eye me-1"></i>
                        Syllabus files can be viewed, but upload
                        is available only to HOD or DEAN of their
                        own department.
                    </span>
                </div>
            )}

            {/* =================================================
                CURRICULUM
            ================================================= */}

            {curricula.length > 0 && (
                <div>
                    {curricula.map((curriculum) => {
                        const courses = (
                            curriculum.courses || []
                        ).filter(
                            (course) =>
                                !isExcludedCourse(course)
                        );

                        const electiveGroups =
                            curriculum.electiveGroups || [];

                        if (
                            courses.length === 0 &&
                            electiveGroups.length === 0
                        ) {
                            return null;
                        }

                        const total =
                            totalForSemester(curriculum);

                        return (
                            <div
                                key={curriculum.semester}
                                className="card border-0 shadow-sm mb-5"
                            >
                                {/* SEMESTER HEADER */}

                                <div className="card-header bg-primary text-white py-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <small className="opacity-75">
                                                {regulationCode}
                                                {" • "}
                                                {departmentCode}
                                            </small>

                                            <h4 className="fw-bold mb-0 mt-1">
                                                {getSemesterTitle(
                                                    curriculum.semester
                                                )}
                                            </h4>
                                        </div>

                                        {canEdit && (
                                            <span className="badge bg-success px-3 py-2">
                                                <i className="bi bi-pencil-square me-1"></i>
                                                Own Department
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* TABLE */}

                                <div className="table-responsive">
                                    <table className="table table-bordered align-middle mb-0">
                                        <thead className="table-light text-center">
                                            <tr>
                                                <th
                                                    style={{
                                                        width: "70px",
                                                    }}
                                                >
                                                    S.No.
                                                </th>

                                                <th
                                                    style={{
                                                        minWidth: "160px",
                                                    }}
                                                >
                                                    Course Code
                                                </th>

                                                <th
                                                    style={{
                                                        minWidth: "320px",
                                                    }}
                                                >
                                                    Course / Elective
                                                </th>

                                                <th
                                                    style={{
                                                        width: "70px",
                                                    }}
                                                >
                                                    L
                                                </th>

                                                <th
                                                    style={{
                                                        width: "70px",
                                                    }}
                                                >
                                                    R
                                                </th>

                                                <th
                                                    style={{
                                                        width: "70px",
                                                    }}
                                                >
                                                    P
                                                </th>

                                                <th
                                                    style={{
                                                        width: "80px",
                                                    }}
                                                >
                                                    C
                                                </th>

                                                <th
                                                    style={{
                                                        minWidth: "190px",
                                                    }}
                                                >
                                                    Syllabus
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {/* =================================================
                                                NORMAL COURSES
                                            ================================================= */}

                                            {courses.map(
                                                (
                                                    course,
                                                    index
                                                ) => (
                                                    <tr
                                                        key={`course-${course.id}`}
                                                    >
                                                        <td className="text-center">
                                                            {index + 1}
                                                        </td>

                                                        <td className="fw-semibold text-nowrap">
                                                            {course.courseCode ||
                                                                "—"}
                                                        </td>

                                                        <td>
                                                            <div className="fw-semibold">
                                                                {course.courseName ||
                                                                    "Unnamed Course"}
                                                            </div>

                                                            {course.courseType && (
                                                                <small className="text-muted">
                                                                    {
                                                                        course.courseType
                                                                    }
                                                                </small>
                                                            )}
                                                        </td>

                                                        <td className="text-center">
                                                            {formatNumber(
                                                                course.lecture
                                                            )}
                                                        </td>

                                                        <td className="text-center">
                                                            {formatNumber(
                                                                course.tutorial
                                                            )}
                                                        </td>

                                                        <td className="text-center">
                                                            {formatNumber(
                                                                course.practical
                                                            )}
                                                        </td>

                                                        <td className="text-center fw-semibold">
                                                            {formatNumber(
                                                                getCredit(
                                                                    course
                                                                )
                                                            )}
                                                        </td>

                                                        <td className="text-center">
                                                            {renderSyllabusActions(
                                                                course,
                                                                "course"
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            )}

                                            {/* =================================================
                                                ELECTIVE GROUPS
                                            ================================================= */}

                                            {electiveGroups.map((group) => {
                                                const open =
                                                    isOpenElective(group);

                                                const groupSubjects =
                                                    subjects[group.id] || [];

                                                const isExpanded = Boolean(
                                                    expandedGroups[group.id]
                                                );

                                                return (
                                                    <tr
                                                        key={`elective-${group.id}`}
                                                    >
                                                        <td
                                                            colSpan="8"
                                                            className="p-0"
                                                        >
                                                            {/* ELECTIVE GROUP HEADER */}

                                                            <div
                                                                className={`p-3 ${open
                                                                        ? "bg-warning-subtle"
                                                                        : "bg-secondary-subtle"
                                                                    }`}
                                                            >
                                                                <div className="d-flex align-items-center gap-2">
                                                                    {/* EXPAND/COLLAPSE BUTTON */}

                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-dark d-flex align-items-center justify-content-center"
                                                                        style={{
                                                                            width: "40px",
                                                                            height: "38px",
                                                                            padding: 0,
                                                                        }}
                                                                        onClick={() =>
                                                                            handleToggleElectiveGroup(
                                                                                group
                                                                            )
                                                                        }
                                                                        title={
                                                                            isExpanded
                                                                                ? "Collapse subjects"
                                                                                : "Expand subjects"
                                                                        }
                                                                    >
                                                                        <i
                                                                            className={`bi ${isExpanded
                                                                                    ? "bi-chevron-up"
                                                                                    : "bi-chevron-down"
                                                                                }`}
                                                                        ></i>
                                                                    </button>

                                                                    {/* ELECTIVE TITLE */}

                                                                    <div>
                                                                        <div className="fw-bold fs-5">
                                                                            {open
                                                                                ? "OPEN ELECTIVE"
                                                                                : "ELECTIVE GROUP"}
                                                                        </div>

                                                                        <div className="fs-5">
                                                                            {group.name ||
                                                                                group.groupName ||
                                                                                "Unnamed Elective Group"}
                                                                        </div>

                                                                        <small className="text-muted">
                                                                            Click the arrow to view subjects
                                                                        </small>
                                                                    </div>
                                                                </div>

                                                                {/* EXPANDED SUBJECT TABLE */}

                                                                {isExpanded && (
                                                                    <div className="mt-3 p-3 bg-light border rounded">
                                                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                                                            <h6 className="fw-bold mb-0">
                                                                                <i className="bi bi-list-ul me-2"></i>
                                                                                Subjects in {" "}
                                                                                {group.name ||
                                                                                    group.groupName ||
                                                                                    "Elective Group"}
                                                                            </h6>

                                                                            {subjectsLoading[group.id] && (
                                                                                <span className="spinner-border spinner-border-sm text-primary"></span>
                                                                            )}
                                                                        </div>

                                                                        {subjectsLoading[group.id] ? (
                                                                            <div className="text-muted">
                                                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                                                Loading subjects...
                                                                            </div>
                                                                        ) : groupSubjects.length === 0 ? (
                                                                            <div className="alert alert-warning mb-0">
                                                                                No subjects available in this group.
                                                                            </div>
                                                                        ) : (
                                                                            <div className="table-responsive">
                                                                                <table className="table table-sm table-bordered align-middle mb-0 bg-white">
                                                                                    <thead className="table-secondary">
                                                                                        <tr>
                                                                                            <th>S.No.</th>
                                                                                            <th>Subject Code</th>
                                                                                            <th>Subject Name</th>
                                                                                            <th className="text-center">L</th>
                                                                                            <th className="text-center">R</th>
                                                                                            <th className="text-center">P</th>
                                                                                            <th className="text-center">C</th>
                                                                                            <th className="text-center">Syllabus</th>
                                                                                        </tr>
                                                                                    </thead>

                                                                                    <tbody>
                                                                                        {groupSubjects.map(
                                                                                            (subject, subjectIndex) => (
                                                                                                <tr
                                                                                                    key={`group-${group.id}-subject-${subject.id}`}
                                                                                                >
                                                                                                    <td>
                                                                                                        {subjectIndex + 1}
                                                                                                    </td>

                                                                                                    <td className="fw-semibold text-nowrap">
                                                                                                        {subject.courseCode ||
                                                                                                            subject.subjectCode ||
                                                                                                            "—"}
                                                                                                    </td>

                                                                                                    <td>
                                                                                                        {subject.courseName ||
                                                                                                            subject.subjectName ||
                                                                                                            "Unnamed Subject"}
                                                                                                    </td>

                                                                                                    <td className="text-center">
                                                                                                        {formatNumber(
                                                                                                            subject.lecture
                                                                                                        )}
                                                                                                    </td>

                                                                                                    <td className="text-center">
                                                                                                        {formatNumber(
                                                                                                            subject.tutorial
                                                                                                        )}
                                                                                                    </td>

                                                                                                    <td className="text-center">
                                                                                                        {formatNumber(
                                                                                                            subject.practical
                                                                                                        )}
                                                                                                    </td>

                                                                                                    <td className="text-center">
                                                                                                        {formatNumber(
                                                                                                            getCredit(subject)
                                                                                                        )}
                                                                                                    </td>

                                                                                                    <td className="text-center">
                                                                                                        {renderSyllabusActions(
                                                                                                            subject,
                                                                                                            "elective"
                                                                                                        )}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            )
                                                                                        )}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>

                                        {/* TOTAL */}

                                        <tfoot>
                                            <tr className="table-dark fw-bold">
                                                <td
                                                    colSpan="3"
                                                    className="text-end"
                                                >
                                                    TOTAL
                                                </td>

                                                <td className="text-center">
                                                    {formatNumber(
                                                        total.lecture
                                                    )}
                                                </td>

                                                <td className="text-center">
                                                    {formatNumber(
                                                        total.tutorial
                                                    )}
                                                </td>

                                                <td className="text-center">
                                                    {formatNumber(
                                                        total.practical
                                                    )}
                                                </td>

                                                <td className="text-center">
                                                    {formatNumber(
                                                        total.credits
                                                    )}
                                                </td>

                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* =================================================
                UPLOAD SYLLABUS MODAL
            ================================================= */}

            {uploadModal.open && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    role="dialog"
                    style={{
                        backgroundColor:
                            "rgba(0, 0, 0, 0.55)",
                    }}
                >
                    <div
                        className="modal-dialog modal-dialog-centered"
                        role="document"
                    >
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-file-earmark-pdf text-danger me-2"></i>
                                    Upload Syllabus
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={
                                        closeUploadModal
                                    }
                                    disabled={uploading}
                                ></button>
                            </div>

                            <div className="modal-body">
                                <div className="alert alert-info small">
                                    <i className="bi bi-info-circle me-2"></i>
                                    Only PDF files are allowed.
                                    Maximum file size is 10 MB.
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-semibold">
                                        Subject
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        value={
                                            uploadModal.item
                                                ?.courseName ||
                                            uploadModal.item
                                                ?.subjectName ||
                                            "Selected Subject"
                                        }
                                        readOnly
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-semibold">
                                        Select PDF File
                                    </label>

                                    <input
                                        type="file"
                                        className="form-control"
                                        accept="application/pdf,.pdf"
                                        onChange={
                                            handleFileChange
                                        }
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
                                    onClick={
                                        closeUploadModal
                                    }
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={
                                        handleUploadSyllabus
                                    }
                                    disabled={
                                        uploading ||
                                        !selectedFile
                                    }
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