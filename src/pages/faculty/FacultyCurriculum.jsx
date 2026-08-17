import { useEffect, useMemo, useState } from "react";

import { toast } from "react-toastify";

import FacultyLayout from "../../layouts/FacultyLayout";

import { useAuth } from "../../context/AuthContext";

import {
    getAllRegulations
} from "../../services/regulationService";

import {
    getAllDepartments
} from "../../services/departmentService";

import {
    getSemesterCurriculum,
    getElectiveSubjects,
    selectElectives
} from "../../services/curriculumService";


function FacultyCurriculum() {

    const { user } = useAuth();
    console.log("LOGGED IN USER:", user);
    console.log("USER ROLE:", user?.role);
    console.log("USER DEPARTMENT:", user?.departmentCode);

    // =====================================================
    // BASIC DATA
    // =====================================================

    const [regulations, setRegulations] =
        useState([]);

    const [departments, setDepartments] =
        useState([]);


    const [regulationCode, setRegulationCode] =
        useState("");

    const [departmentCode, setDepartmentCode] =
        useState("");

    const [semester, setSemester] =
        useState("");


    // =====================================================
    // CURRICULUM
    // =====================================================

    const [courses, setCourses] =
        useState([]);

    const [electives, setElectives] =
        useState([]);


    // =====================================================
    // ELECTIVE SUBJECTS
    // =====================================================

    const [subjects, setSubjects] =
        useState({});


    // =====================================================
    // SELECTED SUBJECTS
    // =====================================================

    const [selections, setSelections] =
        useState({});


    // =====================================================
    // LOADING
    // =====================================================

    const [initialLoading, setInitialLoading] =
        useState(true);

    const [curriculumLoading, setCurriculumLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [subjectsLoading, setSubjectsLoading] =
        useState({});


    // =====================================================
    // CURRENT USER DEPARTMENT
    // =====================================================

    const userDepartmentCode =
        user?.departmentCode
            ?.trim()
            .toUpperCase();


    // =====================================================
    // CAN EDIT CURRENT DEPARTMENT
    // =====================================================

    const canEdit =
        Boolean(
            user &&
            (
                user.role === "HOD" ||
                user.role === "DEAN"
            ) &&
            userDepartmentCode &&
            departmentCode &&
            userDepartmentCode ===
            departmentCode
                ?.trim()
                .toUpperCase()
        );
    console.log("USER ROLE:", user?.role);
    console.log("USER DEPARTMENT:", user?.departmentCode);
    console.log("SELECTED DEPARTMENT:", departmentCode);
    console.log("CAN EDIT:", canEdit);


    // =====================================================
    // LOAD REGULATIONS + DEPARTMENTS
    // =====================================================

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


                // -----------------------------------------
                // Automatically select user's department
                // -----------------------------------------

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


    // =====================================================
    // LOAD CURRICULUM
    // =====================================================

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


            const response =
                await getSemesterCurriculum(
                    regulationCode,
                    departmentCode,
                    Number(semester)
                );


            const curriculum =
                response.data;


            setCourses(
                curriculum?.courses || []
            );


            const groups =
                curriculum?.electives || [];


            setElectives(groups);


            // ---------------------------------------------
            // Existing selections
            // ---------------------------------------------

            const existingSelections = {};


            groups.forEach((group) => {

                if (group.selectedSubject) {

                    existingSelections[
                        group.id
                    ] =
                        group.selectedSubject.id;
                }

            });


            setSelections(
                existingSelections
            );


            // ---------------------------------------------
            // Load subjects
            // ---------------------------------------------

            await loadElectiveSubjects(
                groups
            );


        } catch (error) {

            console.error(
                "Failed to load curriculum:",
                error
            );


            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to load curriculum"
            );


            setCourses([]);
            setElectives([]);
            setSubjects({});
            setSelections({});

        } finally {

            setCurriculumLoading(false);
        }
    };


    // =====================================================
    // LOAD ELECTIVE SUBJECTS
    // =====================================================

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


    // =====================================================
    // CHANGE REGULATION
    // =====================================================

    const handleRegulationChange = (
        event
    ) => {

        setRegulationCode(
            event.target.value
        );

        clearCurriculum();
    };


    // =====================================================
    // CHANGE DEPARTMENT
    // =====================================================

    const handleDepartmentChange = (
        event
    ) => {

        setDepartmentCode(
            event.target.value
        );

        clearCurriculum();
    };


    // =====================================================
    // CHANGE SEMESTER
    // =====================================================

    const handleSemesterChange = (
        event
    ) => {

        setSemester(
            event.target.value
        );

        clearCurriculum();
    };


    // =====================================================
    // CLEAR CURRICULUM
    // =====================================================

    const clearCurriculum = () => {

        setCourses([]);

        setElectives([]);

        setSubjects({});

        setSelections({});
    };


    // =====================================================
    // CHANGE ELECTIVE SELECTION
    // =====================================================

    const handleSelectionChange = (
        groupId,
        subjectId
    ) => {

        if (!canEdit) {
            return;
        }


        setSelections(
            previous => ({
                ...previous,

                [groupId]:
                    subjectId
                        ? Number(subjectId)
                        : null
            })
        );
    };


    // =====================================================
    // SUBMIT ELECTIVES
    // =====================================================

    const handleSubmit = async () => {

        if (!canEdit) {

            toast.error(
                "You can only modify electives for your own department"
            );

            return;
        }


        if (
            !regulationCode ||
            !departmentCode ||
            !semester
        ) {

            toast.error(
                "Please select regulation, department and semester"
            );

            return;
        }


        // ---------------------------------------------
        // Build selection request
        // ---------------------------------------------

        const selectionList =
            electives
                .filter(
                    group =>
                        selections[group.id]
                )
                .map(group => ({
                    electiveGroupId:
                        group.id,

                    subjectId:
                        selections[group.id]
                }));


        if (selectionList.length === 0) {

            toast.error(
                "Please select at least one elective subject"
            );

            return;
        }


        try {

            setSaving(true);


            const response =
                await selectElectives(
                    regulationCode,
                    departmentCode,
                    Number(semester),
                    selectionList
                );


            toast.success(
                response.message ||
                "Elective selections updated successfully"
            );


            // -----------------------------------------
            // Refresh curriculum
            // -----------------------------------------

            await handleLoadCurriculum();


        } catch (error) {

            console.error(
                "Failed to save selections:",
                error
            );


            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to update elective selections"
            );


        } finally {

            setSaving(false);
        }
    };


    // =====================================================
    // TOTAL NORMAL COURSE CREDITS
    // =====================================================

    const totalCourseCredits =
        useMemo(() => {

            return courses.reduce(
                (total, course) =>
                    total +
                    (
                        Number(course.credits) ||
                        0
                    ),
                0
            );

        }, [courses]);


    // =====================================================
    // SELECTED ELECTIVE SUBJECTS
    // =====================================================

    const selectedElectiveSubjects =
        useMemo(() => {

            return electives
                .map(group => {

                    const selectedId =
                        selections[group.id];


                    if (!selectedId) {
                        return null;
                    }


                    return (
                        subjects[group.id]
                            ?.find(
                                subject =>
                                    subject.id ===
                                    selectedId
                            ) ||
                        null
                    );

                })
                .filter(Boolean);

        }, [
            electives,
            selections,
            subjects
        ]);


    // =====================================================
    // TOTAL ELECTIVE CREDITS
    // =====================================================

    const totalElectiveCredits =
        useMemo(() => {

            return selectedElectiveSubjects.reduce(
                (total, subject) =>
                    total +
                    (
                        Number(subject.credits) ||
                        0
                    ),
                0
            );

        }, [
            selectedElectiveSubjects
        ]);


    // =====================================================
    // TOTAL CREDITS
    // =====================================================

    const totalCredits =
        totalCourseCredits +
        totalElectiveCredits;


    // =====================================================
    // TOTAL L-T-P
    // =====================================================

    const totalLecture =
        courses.reduce(
            (total, course) =>
                total +
                (
                    Number(course.lecture) ||
                    0
                ),
            0
        ) +
        selectedElectiveSubjects.reduce(
            (total, subject) =>
                total +
                (
                    Number(subject.lecture) ||
                    0
                ),
            0
        );


    const totalTutorial =
        courses.reduce(
            (total, course) =>
                total +
                (
                    Number(course.tutorial) ||
                    0
                ),
            0
        ) +
        selectedElectiveSubjects.reduce(
            (total, subject) =>
                total +
                (
                    Number(subject.tutorial) ||
                    0
                ),
            0
        );


    const totalPractical =
        courses.reduce(
            (total, course) =>
                total +
                (
                    Number(course.practical) ||
                    0
                ),
            0
        ) +
        selectedElectiveSubjects.reduce(
            (total, subject) =>
                total +
                (
                    Number(subject.practical) ||
                    0
                ),
            0
        );


    const totalLTP =
        `${totalLecture}-${totalTutorial}-${totalPractical}`;


    // =====================================================
    // CATEGORY LABEL
    // =====================================================

    const getCategoryLabel = (
        category
    ) => {

        const labels = {

            CORE: "Core",

            ELECTIVE: "Elective",

            BASIC_SCIENCE:
                "Basic Science",

            ENGINEERING_SCIENCE:
                "Engineering Science",

            HUMANITIES:
                "Humanities",

            LAB: "Lab",

            PROJECT:
                "Project",

            OTHER:
                "Other"
        };


        return (
            labels[category] ||
            category ||
            "Other"
        );
    };


    // =====================================================
    // L-T-P
    // =====================================================

    const getLTP = (item) => {

        return `${item.lecture ?? 0}-${item.tutorial ?? 0}-${item.practical ?? 0}`;
    };


    // =====================================================
    // INITIAL LOADING
    // =====================================================

    if (initialLoading) {

        return (
            <FacultyLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div
                            className="spinner-border text-primary"
                        ></div>

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

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="mb-4">

                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center">

                    <div>

                        <h2 className="fw-bold mb-1">
                            Curriculum
                        </h2>

                        <p className="text-muted mb-0">
                            View semester curriculum
                            and manage elective selections.
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
                FILTER CARD
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
                                value={
                                    regulationCode
                                }
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
                                value={
                                    departmentCode
                                }
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

                                        const isOwnDepartment =
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

                                                {isOwnDepartment
                                                    ? " - My Department"
                                                    : ""
                                                }

                                            </option>

                                        );

                                    }
                                )}

                            </select>


                            {departmentCode &&
                                departmentCode
                                    .toUpperCase() !==
                                userDepartmentCode && (

                                    <small className="text-muted mt-2 d-block">

                                        <i className="bi bi-eye me-1"></i>

                                        View only — you can
                                        edit electives only
                                        for your department.

                                    </small>

                                )}

                        </div>


                        {/* SEMESTER */}

                        <div className="col-12 col-md-2">

                            <label className="form-label fw-semibold">
                                Semester
                            </label>

                            <select
                                className="form-select"
                                value={
                                    semester
                                }
                                onChange={
                                    handleSemesterChange
                                }
                            >

                                <option value="">
                                    Select
                                </option>

                                {[1, 2, 3, 4, 5, 6, 7, 8]
                                    .map(
                                        sem => (

                                            <option
                                                key={sem}
                                                value={sem}
                                            >
                                                Semester {sem}
                                            </option>

                                        )
                                    )}

                            </select>

                        </div>


                        {/* VIEW BUTTON */}

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

                                    <span
                                        className="spinner-border spinner-border-sm"
                                    ></span>

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
                CURRICULUM CONTENT
            ================================================= */}

            {(courses.length > 0 ||
                electives.length > 0) && (

                    <>

                        {/* =================================================
                        VIEW ONLY NOTICE
                    ================================================= */}

                        {!canEdit && (

                            <div className="alert alert-info border-0 shadow-sm">

                                <i className="bi bi-info-circle me-2"></i>

                                You are viewing the{" "}

                                <strong>
                                    {departmentCode}
                                </strong>

                                {" "}department curriculum.

                                You can view the curriculum,
                                but only the HOD/DEAN of that
                                department can modify elective
                                selections.

                            </div>

                        )}


                        {/* =================================================
                        SEMESTER HEADER
                    ================================================= */}

                        <div className="card border-0 shadow-sm mb-4">

                            <div className="card-body p-4">

                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">

                                    <div>

                                        <small className="text-muted">
                                            {regulationCode}
                                            {" • "}
                                            {departmentCode}
                                        </small>

                                        <h4 className="fw-bold mb-0 mt-1">

                                            Semester {semester}

                                        </h4>

                                    </div>


                                    <div className="mt-3 mt-md-0">

                                        {canEdit ? (

                                            <span className="badge bg-success-subtle text-success px-3 py-2">

                                                <i className="bi bi-pencil-square me-1"></i>

                                                Editable

                                            </span>

                                        ) : (

                                            <span className="badge bg-secondary-subtle text-secondary px-3 py-2">

                                                <i className="bi bi-eye me-1"></i>

                                                View Only

                                            </span>

                                        )}

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                        SUMMARY
                    ================================================= */}

                        <div className="row g-3 mb-4">

                            {/* COURSES */}

                            <div className="col-12 col-md-4">

                                <div className="card border-0 shadow-sm h-100">

                                    <div className="card-body">

                                        <div className="d-flex align-items-center">

                                            <div
                                                className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center me-3"
                                                style={{
                                                    width: "48px",
                                                    height: "48px"
                                                }}
                                            >

                                                <i className="bi bi-journal-bookmark fs-5"></i>

                                            </div>


                                            <div>

                                                <small className="text-muted">
                                                    Courses
                                                </small>

                                                <h4 className="fw-bold mb-0">
                                                    {
                                                        courses.length
                                                    }
                                                </h4>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>


                            {/* CREDITS */}

                            <div className="col-12 col-md-4">

                                <div className="card border-0 shadow-sm h-100">

                                    <div className="card-body">

                                        <div className="d-flex align-items-center">

                                            <div
                                                className="bg-success-subtle text-success rounded-3 d-flex align-items-center justify-content-center me-3"
                                                style={{
                                                    width: "48px",
                                                    height: "48px"
                                                }}
                                            >

                                                <i className="bi bi-award fs-5"></i>

                                            </div>


                                            <div>

                                                <small className="text-muted">
                                                    Total Credits
                                                </small>

                                                <h4 className="fw-bold mb-0">
                                                    {
                                                        totalCredits
                                                    }
                                                </h4>

                                                <small className="text-muted">
                                                    Courses: {
                                                        totalCourseCredits
                                                    }

                                                    {" + "}

                                                    Electives: {
                                                        totalElectiveCredits
                                                    }
                                                </small>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>


                            {/* L-T-P */}

                            <div className="col-12 col-md-4">

                                <div className="card border-0 shadow-sm h-100">

                                    <div className="card-body">

                                        <div className="d-flex align-items-center">

                                            <div
                                                className="bg-warning-subtle text-warning rounded-3 d-flex align-items-center justify-content-center me-3"
                                                style={{
                                                    width: "48px",
                                                    height: "48px"
                                                }}
                                            >

                                                <i className="bi bi-grid-3x3-gap fs-5"></i>

                                            </div>


                                            <div>

                                                <small className="text-muted">
                                                    Total L-T-P
                                                </small>

                                                <h4 className="fw-bold mb-0">
                                                    {totalLTP}
                                                </h4>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                        NORMAL COURSES
                    ================================================= */}

                        {courses.length > 0 && (

                            <div className="card border-0 shadow-sm mb-4">

                                <div className="card-header bg-white py-3">

                                    <h5 className="fw-bold mb-0">

                                        <i className="bi bi-book me-2 text-primary"></i>

                                        Courses

                                    </h5>

                                </div>


                                <div className="table-responsive">

                                    <table className="table table-hover align-middle mb-0">

                                        <thead className="table-light">

                                            <tr>

                                                <th className="px-4">
                                                    #
                                                </th>

                                                <th>
                                                    Course Code
                                                </th>

                                                <th>
                                                    Course Name
                                                </th>

                                                <th>
                                                    Category
                                                </th>

                                                <th>
                                                    L-T-P
                                                </th>

                                                <th>
                                                    Credits
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {courses.map(
                                                (course, index) => (

                                                    <tr
                                                        key={
                                                            course.id
                                                        }
                                                    >

                                                        <td className="px-4">
                                                            {
                                                                index + 1
                                                            }
                                                        </td>

                                                        <td className="fw-semibold">
                                                            {
                                                                course.courseCode
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                course.courseName
                                                            }
                                                        </td>

                                                        <td>

                                                            <span className="badge bg-primary-subtle text-primary">

                                                                {
                                                                    getCategoryLabel(
                                                                        course.category
                                                                    )
                                                                }

                                                            </span>

                                                        </td>

                                                        <td>
                                                            {
                                                                getLTP(
                                                                    course
                                                                )
                                                            }
                                                        </td>

                                                        <td className="fw-semibold">
                                                            {
                                                                course.credits
                                                            }
                                                        </td>

                                                    </tr>

                                                )
                                            )}

                                        </tbody>

                                    </table>

                                </div>

                            </div>

                        )}


                        {/* =================================================
                        ELECTIVES
                    ================================================= */}

                        {electives.length > 0 && (

                            <div className="card border-0 shadow-sm mb-4">

                                <div className="card-header bg-white py-3">

                                    <h5 className="fw-bold mb-0">

                                        <i className="bi bi-ui-checks-grid me-2 text-primary"></i>

                                        Elective Selection

                                    </h5>

                                    <small className="text-muted">

                                        {canEdit
                                            ? "Select the subjects for your department."
                                            : "Elective selections are view only."
                                        }

                                    </small>

                                </div>


                                <div className="card-body">

                                    {electives.map(
                                        group => {

                                            const groupSubjects =
                                                subjects[group.id] ||
                                                [];

                                            const loading =
                                                subjectsLoading[
                                                group.id
                                                ];

                                            const selectedSubject =
                                                groupSubjects.find(
                                                    subject =>
                                                        subject.id ===
                                                        selections[group.id]
                                                );


                                            return (

                                                <div
                                                    key={
                                                        group.id
                                                    }
                                                    className="border rounded-3 p-3 mb-3"
                                                >

                                                    {/* GROUP HEADER */}

                                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">

                                                        <div>

                                                            <h6 className="fw-bold mb-1">

                                                                {
                                                                    group.name
                                                                }

                                                            </h6>

                                                            <span className="badge bg-light text-dark border">

                                                                {
                                                                    group.electiveType
                                                                }

                                                            </span>

                                                        </div>


                                                        {group.selectedSubject && (

                                                            <div className="mt-2 mt-md-0">

                                                                <span className="badge bg-success-subtle text-success">

                                                                    <i className="bi bi-check-circle me-1"></i>

                                                                    Currently Selected

                                                                </span>

                                                            </div>

                                                        )}

                                                    </div>


                                                    {/* CURRENT SELECTION */}

                                                    {group.selectedSubject && (

                                                        <div className="alert alert-success py-2">

                                                            <small>

                                                                <strong>
                                                                    Selected:
                                                                </strong>

                                                                {" "}

                                                                {
                                                                    group
                                                                        .selectedSubject
                                                                        .courseCode
                                                                }

                                                                {" - "}

                                                                {
                                                                    group
                                                                        .selectedSubject
                                                                        .courseName
                                                                }

                                                                {" • "}

                                                                {
                                                                    group
                                                                        .selectedSubject
                                                                        .credits
                                                                }

                                                                {" Credits"}

                                                            </small>

                                                        </div>

                                                    )}


                                                    {/* SUBJECT SELECT */}

                                                    {loading ? (

                                                        <div className="text-muted">

                                                            <span
                                                                className="spinner-border spinner-border-sm me-2"
                                                            ></span>

                                                            Loading available subjects...

                                                        </div>

                                                    ) : (

                                                        <>

                                                            <label className="form-label fw-semibold">

                                                                {canEdit
                                                                    ? "Select Subject"
                                                                    : "Selected / Available Subjects"
                                                                }

                                                            </label>


                                                            <select
                                                                className="form-select"
                                                                value={
                                                                    selections[
                                                                    group.id
                                                                    ] || ""
                                                                }
                                                                onChange={
                                                                    (event) =>
                                                                        handleSelectionChange(
                                                                            group.id,
                                                                            event.target.value
                                                                        )
                                                                }
                                                                disabled={
                                                                    !canEdit
                                                                }
                                                            >

                                                                <option value="">
                                                                    Select Subject
                                                                </option>


                                                                {groupSubjects.map(
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

                                                                            {" ("}

                                                                            {
                                                                                subject.credits
                                                                            }

                                                                            {" Credits)"}

                                                                        </option>

                                                                    )
                                                                )}

                                                            </select>


                                                            {!canEdit && (

                                                                <small className="text-muted d-block mt-2">

                                                                    <i className="bi bi-lock me-1"></i>

                                                                    Only the HOD/DEAN
                                                                    of this department
                                                                    can modify this
                                                                    selection.

                                                                </small>

                                                            )}

                                                        </>

                                                    )}

                                                </div>

                                            );

                                        }
                                    )}

                                </div>


                                {/* =================================================
                                SUBMIT
                            ================================================= */}

                                {canEdit && (

                                    <div className="card-footer bg-white border-top p-3">

                                        <div className="d-flex justify-content-end">

                                            <button
                                                className="btn btn-primary px-4"
                                                onClick={
                                                    handleSubmit
                                                }
                                                disabled={
                                                    saving
                                                }
                                            >

                                                {saving ? (

                                                    <>

                                                        <span
                                                            className="spinner-border spinner-border-sm me-2"
                                                        ></span>

                                                        Saving...

                                                    </>

                                                ) : (

                                                    <>

                                                        <i className="bi bi-check-lg me-2"></i>

                                                        Submit Selections

                                                    </>

                                                )}

                                            </button>

                                        </div>

                                    </div>

                                )}

                            </div>

                        )}

                    </>

                )}


            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {!curriculumLoading &&
                courses.length === 0 &&
                electives.length === 0 &&
                regulationCode &&
                departmentCode &&
                semester && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <i
                                className="bi bi-journal-x text-muted"
                                style={{
                                    fontSize: "45px"
                                }}
                            ></i>

                            <h5 className="mt-3">
                                No Curriculum Found
                            </h5>

                            <p className="text-muted mb-0">
                                No courses or elective
                                groups were found for
                                the selected semester.
                            </p>

                        </div>

                    </div>

                )}

        </FacultyLayout>
    );
}

export default FacultyCurriculum;