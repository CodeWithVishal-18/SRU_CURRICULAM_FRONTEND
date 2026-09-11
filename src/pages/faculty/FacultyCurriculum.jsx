import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import FacultyLayout from "../../layouts/FacultyLayout";
import { useAuth } from "../../context/AuthContext";

import { getAllRegulations } from "../../services/regulationService";
import { getAllDepartments } from "../../services/departmentService";

import {
    getSemesterCurriculum,
    getElectiveSubjects,
    selectElectives
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

    const [initialLoading, setInitialLoading] =
        useState(true);

    const [curriculumLoading, setCurriculumLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [subjectsLoading, setSubjectsLoading] =
        useState({});

    // =========================================================
    // USER DEPARTMENT
    // =========================================================

    const userDepartmentCode =
        user?.departmentCode
            ?.trim()
            .toUpperCase();

    const canEdit =
        Boolean(
            user &&
            (user.role === "HOD" ||
                user.role === "DEAN") &&
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
        { value: "8", label: "Semester VIII" }
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
                    departmentResponse
                ] = await Promise.all([
                    getAllRegulations(),
                    getAllDepartments()
                ]);

                setRegulations(
                    regulationResponse.data || []
                );

                setDepartments(
                    departmentResponse.data || []
                );

                if (userDepartmentCode) {

                    setDepartmentCode(
                        userDepartmentCode
                    );
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
    // CLEAR
    // =========================================================

    const clearCurriculum = () => {

        setCurricula([]);
        setSubjects({});
        setSelections({});
        setSubjectsLoading({});
    };

    // =========================================================
    // REGULATION CHANGE
    // =========================================================

    const handleRegulationChange = (event) => {

        setRegulationCode(
            event.target.value
        );

        clearCurriculum();
    };

    // =========================================================
    // DEPARTMENT CHANGE
    // =========================================================

    const handleDepartmentChange = (event) => {

        setDepartmentCode(
            event.target.value
        );

        clearCurriculum();
    };

    // =========================================================
    // SEMESTER CHANGE
    // =========================================================

    const handleSemesterChange = (event) => {

        setSemester(
            event.target.value
        );

        clearCurriculum();
    };

    // =========================================================
    // LOAD CURRICULUM
    // =========================================================

    const handleLoadCurriculum = async () => {

        if (!regulationCode) {

            toast.error(
                "Please select a regulation"
            );

            return;
        }

        if (!departmentCode) {

            toast.error(
                "Please select a department"
            );

            return;
        }

        if (!semester) {

            toast.error(
                "Please select a semester"
            );

            return;
        }

        try {

            setCurriculumLoading(true);

            clearCurriculum();

            // =================================================
            // LOAD ALL SEMESTERS
            // =================================================

            if (semester === "ALL") {

                const semesterNumbers =
                    [1, 2, 3, 4, 5, 6, 7, 8];

                const responses =
                    await Promise.all(
                        semesterNumbers.map(
                            async (sem) => {

                                try {

                                    const response =
                                        await getSemesterCurriculum(
                                            regulationCode,
                                            departmentCode,
                                            sem
                                        );

                                    return {
                                        semester: sem,
                                        courses:
                                            response.data?.courses || [],
                                        electives:
                                            response.data?.electives || []
                                    };

                                } catch (error) {

                                    console.error(
                                        `Failed to load Semester ${sem}:`,
                                        error
                                    );

                                    return {
                                        semester: sem,
                                        courses: [],
                                        electives: []
                                    };
                                }
                            }
                        )
                    );

                setCurricula(responses);

                // -------------------------------------------------
                // LOAD ELECTIVE SUBJECTS
                // -------------------------------------------------

                const allGroups =
                    responses.flatMap(
                        item =>
                            item.electives || []
                    );

                await loadElectiveSubjects(
                    allGroups
                );

                // -------------------------------------------------
                // RESTORE SAVED SELECTIONS
                // -------------------------------------------------

                const existingSelections = {};

                allGroups.forEach(group => {

                    existingSelections[group.id] =
                        (group.selectedSubjects || [])
                            .map(
                                subject =>
                                    Number(subject.id)
                            );
                });

                setSelections(
                    existingSelections
                );

                return;
            }

            // =================================================
            // LOAD ONE SEMESTER
            // =================================================

            const sem =
                Number(semester);

            const response =
                await getSemesterCurriculum(
                    regulationCode,
                    departmentCode,
                    sem
                );

            const curriculum =
                response.data;

            const singleCurriculum = {
                semester: sem,
                courses:
                    curriculum?.courses || [],
                electives:
                    curriculum?.electives || []
            };

            setCurricula(
                [singleCurriculum]
            );

            // -------------------------------------------------
            // LOAD SUBJECTS
            // -------------------------------------------------

            const groups =
                curriculum?.electives || [];

            await loadElectiveSubjects(
                groups
            );

            // -------------------------------------------------
            // RESTORE SAVED SELECTIONS
            // -------------------------------------------------

            const existingSelections = {};

            groups.forEach(group => {

                existingSelections[group.id] =
                    (group.selectedSubjects || [])
                        .map(
                            subject =>
                                Number(subject.id)
                        );
            });

            setSelections(
                existingSelections
            );

        } catch (error) {

            console.error(
                "Failed to load curriculum:",
                error
            );

            toast.error(
                error.response?.data?.message ||
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

    const loadElectiveSubjects = async (
        groups
    ) => {

        const subjectMap = {};

        for (const group of groups) {

            try {

                setSubjectsLoading(
                    previous => ({
                        ...previous,
                        [group.id]: true
                    })
                );

                const response =
                    await getElectiveSubjects(
                        group.id
                    );

                subjectMap[group.id] =
                    response.data || [];

            } catch (error) {

                console.error(
                    `Failed to load subjects for group ${group.id}:`,
                    error
                );

                subjectMap[group.id] = [];

            } finally {

                setSubjectsLoading(
                    previous => ({
                        ...previous,
                        [group.id]: false
                    })
                );
            }
        }

        setSubjects(subjectMap);
    };

    // =========================================================
    // OPEN ELECTIVE CHECK
    // =========================================================

    const isOpenElective = (group) => {

        const type =
            String(
                group?.electiveType || ""
            )
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
    // HN / MN FILTER
    // =========================================================

    const isExcludedCourse = (course) => {

        const code =
            String(
                course?.courseCode || ""
            )
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

        const number =
            Number(value) || 0;

        return Number.isInteger(number)
            ? number
            : Number(number.toFixed(2));
    };

    // =========================================================
    // CREDIT
    // =========================================================

    const getCredit = (item) => {

        const stored =
            Number(item?.credits);

        if (
            Number.isFinite(stored) &&
            stored > 0
        ) {
            return stored;
        }

        const l =
            Number(item?.lecture) || 0;

        const r =
            Number(item?.tutorial) || 0;

        const p =
            Number(item?.practical) || 0;

        if (
            l === 0 &&
            r === 0 &&
            p === 0
        ) {
            return 0;
        }

        return (
            l +
            (0.5 * r) +
            (0.5 * p)
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

        const selectedValues =
            Array.from(
                event.target.selectedOptions
            ).map(
                option =>
                    Number(option.value)
            );

        setSelections(
            previous => ({
                ...previous,
                [groupId]:
                    selectedValues
            })
        );
    };

    // =========================================================
    // SAVE ELECTIVES
    // =========================================================

    const handleSave = async () => {

        if (!canEdit) {

            toast.error(
                "You can only modify electives for your own department"
            );

            return;
        }

        if (
            !regulationCode ||
            !departmentCode
        ) {

            toast.error(
                "Please select regulation and department"
            );

            return;
        }

        const requests = [];

        // -----------------------------------------------------
        // EVERY SEMESTER IS SENT SEPARATELY
        // -----------------------------------------------------

        curricula.forEach(curriculum => {

            const selectionList = [];

            const openGroups =
                (curriculum.electives || [])
                    .filter(
                        isOpenElective
                    );

            openGroups.forEach(group => {

                const selectedIds =
                    selections[group.id] || [];

                selectedIds.forEach(
                    subjectId => {

                        selectionList.push({
                            electiveGroupId:
                                group.id,

                            subjectId:
                                subjectId
                        });
                    }
                );
            });

            // -------------------------------------------------
            // SEND EVEN IF EMPTY
            // -------------------------------------------------
            //
            // Empty means clear previous selections.
            // -------------------------------------------------

            if (openGroups.length > 0) {

                requests.push(
                    selectElectives(
                        regulationCode,
                        departmentCode,
                        curriculum.semester,
                        {
                            selections:
                                selectionList
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

            await Promise.all(
                requests
            );

            toast.success(
                "Open Elective selections saved successfully"
            );

            // Reload from database.
            await handleLoadCurriculum();

        } catch (error) {

            console.error(
                "Failed to save electives:",
                error
            );

            toast.error(
                error.response?.data?.message ||
                "Failed to update elective selections"
            );

        } finally {

            setSaving(false);
        }
    };

    // =========================================================
    // TOTAL
    // =========================================================
    //
    // IMPORTANT:
    //
    // A selected elective group contributes its SLOT values
    // only once.
    //
    // If 1 subject is selected:
    //      group C = 3 -> +3
    //
    // If 5 subjects are selected:
    //      group C = 3 -> still +3
    //
    // =========================================================

    const totalForSemester = (
        curriculum
    ) => {

        const courses =
            (curriculum.courses || [])
                .filter(
                    course =>
                        !isExcludedCourse(course)
                );

        const electives =
            curriculum.electives || [];

        // -----------------------------------------------------
        // NORMAL COURSE TOTALS
        // -----------------------------------------------------

        const lecture =
            courses.reduce(
                (sum, course) =>
                    sum +
                    (Number(course.lecture) || 0),
                0
            );

        const tutorial =
            courses.reduce(
                (sum, course) =>
                    sum +
                    (Number(course.tutorial) || 0),
                0
            );

        const practical =
            courses.reduce(
                (sum, course) =>
                    sum +
                    (Number(course.practical) || 0),
                0
            );

        const credits =
            courses.reduce(
                (sum, course) =>
                    sum +
                    getCredit(course),
                0
            );

        // -----------------------------------------------------
        // ELECTIVE TOTALS
        // -----------------------------------------------------
        //
        // Open Elective:
        // contributes only when at least one subject is selected.
        //
        // Other elective groups:
        // their slot contributes once because they are fixed
        // curriculum slots.
        // -----------------------------------------------------

        const selectedElectives =
            electives.filter(
                group => {

                    if (
                        isOpenElective(group)
                    ) {

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
                    sum +
                    getCredit(group),
                0
            );

        return {
            lecture: finalLecture,
            tutorial: finalTutorial,
            practical: finalPractical,
            credits: finalCredits
        };
    };

    // =========================================================
    // DEPARTMENT NAME
    // =========================================================

    const getDepartmentName = () => {

        const department =
            departments.find(
                item =>
                    item.code
                        ?.trim()
                        .toUpperCase() ===
                    departmentCode
                        ?.trim()
                        .toUpperCase()
            );

        return (
            department?.name ||
            departmentCode
        );
    };

    // =========================================================
    // SEMESTER TITLE
    // =========================================================

    const getSemesterTitle = (
        semesterNumber
    ) => {

        const titles = {
            1: "I SEM",
            2: "II SEM",
            3: "III SEM",
            4: "IV SEM",
            5: "V SEM",
            6: "VI SEM",
            7: "VII SEM",
            8: "VIII SEM"
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
                            Curriculum
                        </h2>

                        <p className="text-muted mb-0">
                            View semester-wise curriculum
                            and manage Open Electives.
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
                                    regulation => (

                                        <option
                                            key={
                                                regulation.code
                                            }
                                            value={
                                                regulation.code
                                            }
                                        >
                                            {
                                                regulation.code
                                            }
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
                                    department => {

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

                                                {
                                                    department.name
                                                }

                                                {" ("}

                                                {
                                                    department.code
                                                }

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

                                {semesters.map(
                                    item => (

                                        <option
                                            key={
                                                item.value
                                            }
                                            value={
                                                item.value
                                            }
                                        >
                                            {
                                                item.label
                                            }
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                        {/* VIEW */}

                        <div className="col-12 col-md-2">

                            <button
                                className="btn btn-primary w-100"
                                onClick={
                                    handleLoadCurriculum
                                }
                                disabled={
                                    curriculumLoading
                                }
                            >

                                {curriculumLoading ? (

                                    <span className="spinner-border spinner-border-sm"></span>

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

            {curricula.length > 0 &&
                !canEdit && (

                    <div className="alert alert-info border-0 shadow-sm">

                        <i className="bi bi-info-circle me-2"></i>

                        You are viewing the

                        <strong className="mx-1">
                            {getDepartmentName()}
                        </strong>

                        curriculum.

                        Open Electives are

                        <strong className="mx-1">
                            view only
                        </strong>

                        because this is not your department.

                    </div>
                )}

            {/* =================================================
                CURRICULUM
            ================================================= */}

            {curricula.length > 0 && (

                <div>

                    {curricula.map(
                        curriculum => {

                            const courses =
                                (curriculum.courses || [])
                                    .filter(
                                        course =>
                                            !isExcludedCourse(course)
                                    );

                            const electives =
                                curriculum.electives || [];

                            if (
                                courses.length === 0 &&
                                electives.length === 0
                            ) {
                                return null;
                            }

                            const total =
                                totalForSemester(
                                    curriculum
                                );

                            return (

                                <div
                                    key={
                                        curriculum.semester
                                    }
                                    className="card border-0 shadow-sm mb-5"
                                >

                                    {/* =================================================
                                        SEMESTER HEADER
                                    ================================================= */}

                                    <div className="card-header bg-primary text-white py-3">

                                        <div className="d-flex justify-content-between align-items-center">

                                            <div>

                                                <small className="opacity-75">

                                                    {regulationCode}

                                                    {" • "}

                                                    {departmentCode}

                                                </small>

                                                <h4 className="fw-bold mb-0 mt-1">

                                                    {
                                                        getSemesterTitle(
                                                            curriculum.semester
                                                        )
                                                    }

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

                                    {/* =================================================
                                        TABLE
                                    ================================================= */}

                                    <div className="table-responsive">

                                        <table className="table table-bordered align-middle mb-0">

                                            <thead className="table-light text-center">

                                                <tr>

                                                    <th style={{ width: "70px" }}>
                                                        S.No.
                                                    </th>

                                                    <th style={{ minWidth: "190px" }}>
                                                        Course Code
                                                    </th>

                                                    <th style={{ minWidth: "420px" }}>
                                                        Course
                                                    </th>

                                                    <th style={{ width: "70px" }}>
                                                        L
                                                    </th>

                                                    <th style={{ width: "70px" }}>
                                                        R
                                                    </th>

                                                    <th style={{ width: "70px" }}>
                                                        P
                                                    </th>

                                                    <th style={{ width: "90px" }}>
                                                        C
                                                    </th>

                                                </tr>

                                            </thead>

                                            <tbody>

                                                {/* =================================================
                                                    NORMAL COURSES
                                                ================================================= */}

                                                {courses.map(
                                                    (course, index) => (

                                                        <tr
                                                            key={
                                                                `course-${course.id}`
                                                            }
                                                        >

                                                            <td className="text-center">
                                                                {index + 1}
                                                            </td>

                                                            <td className="fw-semibold text-nowrap">
                                                                {
                                                                    course.courseCode ||
                                                                    "—"
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    course.courseName
                                                                }
                                                            </td>

                                                            <td className="text-center">
                                                                {
                                                                    formatNumber(
                                                                        course.lecture
                                                                    )
                                                                }
                                                            </td>

                                                            <td className="text-center">
                                                                {
                                                                    formatNumber(
                                                                        course.tutorial
                                                                    )
                                                                }
                                                            </td>

                                                            <td className="text-center">
                                                                {
                                                                    formatNumber(
                                                                        course.practical
                                                                    )
                                                                }
                                                            </td>

                                                            <td className="text-center fw-semibold">
                                                                {
                                                                    formatNumber(
                                                                        getCredit(
                                                                            course
                                                                        )
                                                                    )
                                                                }
                                                            </td>

                                                        </tr>

                                                    )
                                                )}

                                                {/* =================================================
                                                    ELECTIVE GROUPS
                                                ================================================= */}

                                                {electives.map(
                                                    group => {

                                                        const open =
                                                            isOpenElective(
                                                                group
                                                            );

                                                        const selectedIds =
                                                            selections[
                                                                group.id
                                                            ] || [];

                                                        const groupSubjects =
                                                            subjects[
                                                                group.id
                                                            ] || [];

                                                        return (

                                                            <tr
                                                                key={
                                                                    `elective-${group.id}`
                                                                }
                                                                className={
                                                                    open
                                                                        ? "table-warning"
                                                                        : "table-secondary"
                                                                }
                                                            >

                                                                {/* S.NO */}

                                                                <td className="text-center fw-semibold">
                                                                    {courses.length + 1}
                                                                </td>

                                                                {/* CODE */}

                                                                <td className="fw-semibold">

                                                                    {open
                                                                        ? "OPEN ELECTIVE"
                                                                        : "ELECTIVE"}

                                                                </td>

                                                                {/* COURSE */}

                                                                <td>

                                                                    <div className="fw-semibold mb-2">

                                                                        {
                                                                            group.name
                                                                        }

                                                                    </div>

                                                                    {/* =================================================
                                                                        OPEN ELECTIVE SELECTOR
                                                                    ================================================= */}

                                                                    {open && (

                                                                        <div>

                                                                            {subjectsLoading[
                                                                                group.id
                                                                            ] ? (

                                                                                <div className="text-muted">

                                                                                    <span className="spinner-border spinner-border-sm me-2"></span>

                                                                                    Loading subjects...

                                                                                </div>

                                                                            ) : (

                                                                                <>

                                                                                    {canEdit ? (

                                                                                        <>
                                                                                            <select
                                                                                                multiple
                                                                                                className="form-select"
                                                                                                size="6"
                                                                                                value={
                                                                                                    selectedIds.map(
                                                                                                        String
                                                                                                    )
                                                                                                }
                                                                                                onChange={
                                                                                                    event =>
                                                                                                        handleSubjectChange(
                                                                                                            group.id,
                                                                                                            event
                                                                                                        )
                                                                                                }
                                                                                            >

                                                                                                {groupSubjects
                                                                                                    .filter(
                                                                                                        subject =>
                                                                                                            !isExcludedCourse(
                                                                                                                subject
                                                                                                            )
                                                                                                    )
                                                                                                    .map(
                                                                                                        subject => (

                                                                                                            <option
                                                                                                                key={
                                                                                                                    subject.id
                                                                                                                }
                                                                                                                value={
                                                                                                                    subject.id
                                                                                                                }
                                                                                                            >

                                                                                                                {
                                                                                                                    subject.courseCode
                                                                                                                }

                                                                                                                {" - "}

                                                                                                                {
                                                                                                                    subject.courseName
                                                                                                                }

                                                                                                            </option>

                                                                                                        )
                                                                                                    )}

                                                                                            </select>

                                                                                            {/* ALREADY SELECTED SUBJECTS */}

                                                                                            {selectedIds.length > 0 && (

                                                                                                <div className="mt-3">

                                                                                                    <div className="small fw-semibold text-muted mb-2">
                                                                                                        Already Selected:
                                                                                                    </div>

                                                                                                    {selectedIds.map(id => {

                                                                                                        const subject =
                                                                                                            groupSubjects.find(
                                                                                                                item =>
                                                                                                                    Number(item.id) ===
                                                                                                                    Number(id)
                                                                                                            );

                                                                                                        if (!subject) {
                                                                                                            return null;
                                                                                                        }

                                                                                                        return (

                                                                                                            <div
                                                                                                                key={id}
                                                                                                                className="alert alert-success py-2 px-3 mb-2"
                                                                                                            >

                                                                                                                <i className="bi bi-check-circle me-2"></i>

                                                                                                                <strong>
                                                                                                                    {
                                                                                                                        subject.courseCode
                                                                                                                    }
                                                                                                                </strong>

                                                                                                                {" - "}

                                                                                                                {
                                                                                                                    subject.courseName
                                                                                                                }

                                                                                                            </div>

                                                                                                        );

                                                                                                    })}

                                                                                                </div>

                                                                                            )}

                                                                                        </>

                                                                                    ) : (

                                                                                        <div className="alert alert-light border mb-0">

                                                                                            <i className="bi bi-eye me-2"></i>

                                                                                            View only

                                                                                        </div>

                                                                                    )}

                                                                                    {canEdit && (

                                                                                        <small className="text-muted d-block mt-2">

                                                                                            <i className="bi bi-info-circle me-1"></i>

                                                                                            Hold Ctrl
                                                                                            {" "}
                                                                                            (Windows)
                                                                                            {" "}
                                                                                            or Command
                                                                                            {" "}
                                                                                            (Mac)
                                                                                            {" "}
                                                                                            to select multiple subjects.

                                                                                        </small>

                                                                                    )}

                                                                                    {groupSubjects.length === 0 && (

                                                                                        <small className="text-danger d-block mt-2">

                                                                                            No Open Elective subjects are available.

                                                                                        </small>

                                                                                    )}

                                                                                </>

                                                                            )}

                                                                        </div>

                                                                    )}

                                                                    {/* =================================================
                                                                        SAVED SELECTIONS FOR VIEW ONLY
                                                                    ================================================= */}

                                                                    {open &&
                                                                        !canEdit &&
                                                                        selectedIds.length > 0 && (

                                                                            <div className="mt-3">

                                                                                <div className="small fw-semibold text-muted mb-2">

                                                                                    Selected Subjects:

                                                                                </div>

                                                                                {selectedIds.map(
                                                                                    id => {

                                                                                        const subject =
                                                                                            groupSubjects.find(
                                                                                                item =>
                                                                                                    Number(
                                                                                                        item.id
                                                                                                    ) ===
                                                                                                    Number(id)
                                                                                            );

                                                                                        if (!subject) {
                                                                                            return null;
                                                                                        }

                                                                                        return (

                                                                                            <span
                                                                                                key={
                                                                                                    id
                                                                                                }
                                                                                                className="badge bg-primary me-2 mb-2"
                                                                                            >

                                                                                                {
                                                                                                    subject.courseCode
                                                                                                }

                                                                                                {" - "}

                                                                                                {
                                                                                                    subject.courseName
                                                                                                }

                                                                                            </span>

                                                                                        );
                                                                                    }
                                                                                )}

                                                                            </div>
                                                                        )}

                                                                </td>

                                                                {/* L */}

                                                                <td className="text-center fw-semibold">

                                                                    {
                                                                        formatNumber(
                                                                            group.lecture
                                                                        )
                                                                    }

                                                                </td>

                                                                {/* R */}

                                                                <td className="text-center fw-semibold">

                                                                    {
                                                                        formatNumber(
                                                                            group.tutorial
                                                                        )
                                                                    }

                                                                </td>

                                                                {/* P */}

                                                                <td className="text-center fw-semibold">

                                                                    {
                                                                        formatNumber(
                                                                            group.practical
                                                                        )
                                                                    }

                                                                </td>

                                                                {/* C */}

                                                                <td className="text-center fw-bold">

                                                                    {
                                                                        formatNumber(
                                                                            getCredit(
                                                                                group
                                                                            )
                                                                        )
                                                                    }

                                                                </td>

                                                            </tr>
                                                        );
                                                    }
                                                )}

                                            </tbody>

                                            {/* =================================================
                                                TOTAL
                                            ================================================= */}

                                            <tfoot>

                                                <tr className="table-dark fw-bold">

                                                    <td
                                                        colSpan="3"
                                                        className="text-end"
                                                    >
                                                        TOTAL
                                                    </td>

                                                    <td className="text-center">
                                                        {
                                                            formatNumber(
                                                                total.lecture
                                                            )
                                                        }
                                                    </td>

                                                    <td className="text-center">
                                                        {
                                                            formatNumber(
                                                                total.tutorial
                                                            )
                                                        }
                                                    </td>

                                                    <td className="text-center">
                                                        {
                                                            formatNumber(
                                                                total.practical
                                                            )
                                                        }
                                                    </td>

                                                    <td className="text-center">
                                                        {
                                                            formatNumber(
                                                                total.credits
                                                            )
                                                        }
                                                    </td>

                                                </tr>

                                            </tfoot>

                                        </table>

                                    </div>

                                </div>
                            );
                        }
                    )}

                </div>
            )}

            {/* =================================================
                SAVE BUTTON
            ================================================= */}

            {curricula.length > 0 &&
                canEdit && (

                    <div className="d-flex justify-content-end mb-5">

                        <button
                            className="btn btn-success px-4 py-2"
                            onClick={handleSave}
                            disabled={saving}
                        >

                            {saving ? (

                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Saving...
                                </>

                            ) : (

                                <>
                                    <i className="bi bi-check-circle me-2"></i>
                                    Save Elective Selections
                                </>
                            )}

                        </button>

                    </div>
                )}

        </FacultyLayout>
    );
}

export default FacultyCurriculum;