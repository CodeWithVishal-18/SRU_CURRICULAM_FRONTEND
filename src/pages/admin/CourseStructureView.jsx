import { useEffect, useState } from "react";

import { toast } from "react-toastify";

import AdminLayout from "../../layouts/AdminLayout";

import {
    getAllRegulations
} from "../../services/regulationService";

import {
    getAllDepartments
} from "../../services/departmentService";

import {
    getAdminSemesterCurriculum,
    getAdminElectiveSubjects,
    updateAdminElectives,
    deleteAdminElectiveSelection,
    deleteAdminElectiveGroup
} from "../../services/adminCurriculumService";


function CourseStructureView() {

    // =====================================================
    // STATE
    // =====================================================

    const [regulations, setRegulations] =
        useState([]);

    const [departments, setDepartments] =
        useState([]);

    const [regulationCode, setRegulationCode] =
        useState("");

    const [departmentCode, setDepartmentCode] =
        useState("");

    const [curriculum, setCurriculum] =
        useState(null);

    const [loadingInitial, setLoadingInitial] =
        useState(true);

    const [loadingCurriculum, setLoadingCurriculum] =
        useState(false);

    const [expandedSemesters, setExpandedSemesters] =
        useState([]);

    // -----------------------------------------------------
    // ELECTIVE MODAL
    // -----------------------------------------------------

    const [showElectiveModal, setShowElectiveModal] =
        useState(false);

    const [selectedGroup, setSelectedGroup] =
        useState(null);

    const [electiveSubjects, setElectiveSubjects] =
        useState([]);

    const [selectedSubjectIds, setSelectedSubjectIds] =
        useState([]);

    const [loadingSubjects, setLoadingSubjects] =
        useState(false);

    const [savingElectives, setSavingElectives] =
        useState(false);


    // =====================================================
    // LOAD REGULATIONS + DEPARTMENTS
    // =====================================================

    useEffect(() => {

        const loadInitialData = async () => {

            try {

                setLoadingInitial(true);

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

            } catch (error) {

                console.error(
                    "Failed to load initial data:",
                    error
                );

                toast.error(
                    error.response
                        ?.data
                        ?.message ||
                    "Failed to load regulations or departments"
                );

            } finally {

                setLoadingInitial(false);
            }
        };

        loadInitialData();

    }, []);


    // =====================================================
    // LOAD COMPLETE CURRICULUM
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

        try {

            setLoadingCurriculum(true);

            const response =
                await getAdminSemesterCurriculum(
                    regulationCode,
                    departmentCode
                );

            const data =
                response.data;

            setCurriculum(data);

            // Expand all semesters initially
            setExpandedSemesters(
                data?.semesters?.map(
                    semester =>
                        semester.semester
                ) || []
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

            setCurriculum(null);

        } finally {

            setLoadingCurriculum(false);
        }
    };


    // =====================================================
    // RESET WHEN REGULATION CHANGES
    // =====================================================

    const handleRegulationChange = (event) => {

        setRegulationCode(
            event.target.value
        );

        setCurriculum(null);
        setExpandedSemesters([]);
    };


    // =====================================================
    // RESET WHEN DEPARTMENT CHANGES
    // =====================================================

    const handleDepartmentChange = (event) => {

        setDepartmentCode(
            event.target.value
        );

        setCurriculum(null);
        setExpandedSemesters([]);
    };


    // =====================================================
    // TOGGLE SEMESTER
    // =====================================================

    const toggleSemester = (semesterNumber) => {

        setExpandedSemesters(prev => {

            if (prev.includes(semesterNumber)) {

                return prev.filter(
                    semester =>
                        semester !== semesterNumber
                );
            }

            return [
                ...prev,
                semesterNumber
            ];
        });
    };


    // =====================================================
    // EXPAND ALL
    // =====================================================

    const expandAll = () => {

        setExpandedSemesters(
            curriculum?.semesters?.map(
                semester =>
                    semester.semester
            ) || []
        );
    };


    // =====================================================
    // COLLAPSE ALL
    // =====================================================

    const collapseAll = () => {

        setExpandedSemesters([]);
    };


    // =====================================================
    // CATEGORY BADGE
    // =====================================================

    const getCategoryBadge = (category) => {

        if (!category) {

            return (
                <span className="badge bg-secondary-subtle text-secondary">
                    Other
                </span>
            );
        }

        const categoryNames = {

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
            <span className="badge bg-primary-subtle text-primary">
                {
                    categoryNames[category] ||
                    category
                }
            </span>
        );
    };


    // =====================================================
    // L-T-P
    // =====================================================

    const getLTP = (item) => {

        const lecture =
            item.lecture ?? 0;

        const tutorial =
            item.tutorial ?? 0;

        const practical =
            item.practical ?? 0;

        return `${lecture}-${tutorial}-${practical}`;
    };


    // =====================================================
    // SEMESTER TOTALS
    // =====================================================

    const getSemesterTotals = (semesterData) => {

        let credits = 0;

        let lecture = 0;

        let tutorial = 0;

        let practical = 0;

        // -------------------------------------------------
        // NORMAL COURSES
        // -------------------------------------------------

        (semesterData.courses || [])
            .forEach(course => {

                credits +=
                    Number(course.credits) || 0;

                lecture +=
                    Number(course.lecture) || 0;

                tutorial +=
                    Number(course.tutorial) || 0;

                practical +=
                    Number(course.practical) || 0;
            });


        // -------------------------------------------------
        // ELECTIVE GROUPS
        // -------------------------------------------------
        //
        // IMPORTANT:
        // Group L/T/P/C is counted ONCE.
        //
        // We do NOT add selected subjects here.
        //
        // -------------------------------------------------

        (semesterData.electives || [])
            .forEach(group => {

                if (
                    group.selectedSubjects &&
                    group.selectedSubjects.length > 0
                ) {

                    credits +=
                        Number(group.credits) || 0;

                    lecture +=
                        Number(group.lecture) || 0;

                    tutorial +=
                        Number(group.tutorial) || 0;

                    practical +=
                        Number(group.practical) || 0;
                }
            });


        return {
            credits,
            lecture,
            tutorial,
            practical,
            ltp:
                `${lecture}-${tutorial}-${practical}`
        };
    };


    // =====================================================
    // OPEN ELECTIVE MODAL
    // =====================================================

    const handleOpenElectiveModal = async (
        group,
        semesterNumber
    ) => {

        try {

            setSelectedGroup({
                ...group,
                semesterNumber
            });

            setShowElectiveModal(true);

            setLoadingSubjects(true);

            const response =
                await getAdminElectiveSubjects(
                    group.id
                );

            const subjects =
                response.data || [];

            setElectiveSubjects(subjects);

            // Existing selections
            const existingIds =
                (group.selectedSubjects || [])
                    .map(subject =>
                        subject.id
                    );

            setSelectedSubjectIds(
                existingIds
            );

        } catch (error) {

            console.error(
                "Failed to load elective subjects:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to load elective subjects"
            );

            setShowElectiveModal(false);

        } finally {

            setLoadingSubjects(false);
        }
    };


    // =====================================================
    // CLOSE ELECTIVE MODAL
    // =====================================================

    const handleCloseElectiveModal = () => {

        if (savingElectives) {
            return;
        }

        setShowElectiveModal(false);

        setSelectedGroup(null);

        setElectiveSubjects([]);

        setSelectedSubjectIds([]);
    };


    // =====================================================
    // TOGGLE SUBJECT
    // =====================================================

    const toggleSubject = (subjectId) => {

        setSelectedSubjectIds(prev => {

            if (prev.includes(subjectId)) {

                return prev.filter(
                    id =>
                        id !== subjectId
                );
            }

            return [
                ...prev,
                subjectId
            ];
        });
    };


    // =====================================================
    // SAVE ELECTIVES
    // =====================================================

    const handleSaveElectives = async () => {

        if (!selectedGroup) {
            return;
        }

        try {

            setSavingElectives(true);

            // -------------------------------------------------
            // Build complete selection list
            //
            // We need to send selections for ALL elective
            // groups in the semester so backend can
            // synchronize them.
            // -------------------------------------------------

            const semesterNumber =
                selectedGroup.semesterNumber;

            const semesterData =
                curriculum?.semesters?.find(
                    item =>
                        item.semester === semesterNumber
                );

            if (!semesterData) {

                toast.error(
                    "Semester data not found"
                );

                return;
            }

            const selections = [];

            (semesterData.electives || [])
                .forEach(group => {

                    if (
                        group.id ===
                        selectedGroup.id
                    ) {

                        selectedSubjectIds
                            .forEach(subjectId => {

                                selections.push({
                                    electiveGroupId:
                                        group.id,

                                    subjectId
                                });
                            });

                    } else {

                        // Preserve selections from
                        // other groups.
                        (group.selectedSubjects || [])
                            .forEach(subject => {

                                selections.push({
                                    electiveGroupId:
                                        group.id,

                                    subjectId:
                                        subject.id
                                });
                            });
                    }
                });


            const response =
                await updateAdminElectives(
                    regulationCode,
                    departmentCode,
                    semesterNumber,
                    selections
                );

            // -------------------------------------------------
            // Update only the relevant semester
            // -------------------------------------------------

            const updatedSemester =
                response.data;

            setCurriculum(prev => {

                if (!prev) {
                    return prev;
                }

                return {
                    ...prev,

                    semesters:
                        prev.semesters.map(
                            semester => {

                                if (
                                    semester.semester ===
                                    semesterNumber
                                ) {

                                    return updatedSemester;
                                }

                                return semester;
                            }
                        )
                };
            });

            toast.success(
                "Elective selections updated successfully"
            );

            handleCloseElectiveModal();

        } catch (error) {

            console.error(
                "Failed to save electives:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to update elective selections"
            );

        } finally {

            setSavingElectives(false);
        }
    };


    // =====================================================
    // REMOVE SELECTED ELECTIVE
    // =====================================================

    const handleRemoveSelection = async (
        group,
        subject,
        semesterNumber
    ) => {

        const confirmed =
            window.confirm(
                `Remove "${subject.courseName}" from this elective group?`
            );

        if (!confirmed) {
            return;
        }

        try {

            const remainingSelections = [];

            const semesterData =
                curriculum?.semesters?.find(
                    item =>
                        item.semester ===
                        semesterNumber
                );

            if (!semesterData) {
                return;
            }

            (semesterData.electives || [])
                .forEach(electiveGroup => {

                    (electiveGroup.selectedSubjects || [])
                        .forEach(selectedSubject => {

                            // Skip the subject being removed
                            if (
                                electiveGroup.id ===
                                    group.id &&
                                selectedSubject.id ===
                                    subject.id
                            ) {
                                return;
                            }

                            remainingSelections.push({
                                electiveGroupId:
                                    electiveGroup.id,

                                subjectId:
                                    selectedSubject.id
                            });
                        });
                });


            const response =
                await updateAdminElectives(
                    regulationCode,
                    departmentCode,
                    semesterNumber,
                    remainingSelections
                );

            const updatedSemester =
                response.data;

            setCurriculum(prev => {

                if (!prev) {
                    return prev;
                }

                return {
                    ...prev,

                    semesters:
                        prev.semesters.map(
                            semester => {

                                if (
                                    semester.semester ===
                                    semesterNumber
                                ) {

                                    return updatedSemester;
                                }

                                return semester;
                            }
                        )
                };
            });

            toast.success(
                "Elective removed successfully"
            );

        } catch (error) {

            console.error(
                "Failed to remove elective:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to remove elective"
            );
        }
    };


    // =====================================================
    // DELETE ELECTIVE GROUP
    // =====================================================

    const handleDeleteGroup = async (
        group,
        semesterNumber
    ) => {

        const confirmed =
            window.confirm(
                `Delete the entire "${group.name}" elective group? This will remove its selections as well.`
            );

        if (!confirmed) {
            return;
        }

        try {

            await deleteAdminElectiveGroup(
                group.id
            );

            setCurriculum(prev => {

                if (!prev) {
                    return prev;
                }

                return {
                    ...prev,

                    semesters:
                        prev.semesters.map(
                            semester => {

                                if (
                                    semester.semester ===
                                    semesterNumber
                                ) {

                                    return {
                                        ...semester,

                                        electives:
                                            semester.electives
                                                .filter(
                                                    elective =>
                                                        elective.id !==
                                                        group.id
                                                )
                                    };
                                }

                                return semester;
                            }
                        )
                };
            });

            toast.success(
                "Elective group deleted successfully"
            );

        } catch (error) {

            console.error(
                "Failed to delete elective group:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to delete elective group"
            );
        }
    };


    // =====================================================
    // RENDER COURSE TABLE
    // =====================================================

    const renderCourses = (courses) => {

        if (!courses || courses.length === 0) {

            return (
                <div className="text-muted py-3">
                    <i className="bi bi-journal-x me-2"></i>
                    No normal courses in this semester.
                </div>
            );
        }

        return (
            <div className="table-responsive">

                <table className="table table-hover align-middle mb-0">

                    <thead className="table-light">

                        <tr>

                            <th className="px-3">
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

                                    <td className="px-3">
                                        {
                                            index + 1
                                        }
                                    </td>

                                    <td>
                                        <span className="fw-semibold">
                                            {
                                                course.courseCode ||
                                                "Pending"
                                            }
                                        </span>
                                    </td>

                                    <td>
                                        {
                                            course.courseName
                                        }
                                    </td>

                                    <td>
                                        {
                                            getCategoryBadge(
                                                course.category
                                            )
                                        }
                                    </td>

                                    <td>
                                        {
                                            getLTP(
                                                course
                                            )
                                        }
                                    </td>

                                    <td>
                                        <span className="fw-semibold">
                                            {
                                                course.credits ??
                                                0
                                            }
                                        </span>
                                    </td>

                                </tr>
                            )
                        )}

                    </tbody>

                </table>

            </div>
        );
    };


    // =====================================================
    // RENDER ELECTIVES
    // =====================================================

    const renderElectives = (
        electives,
        semesterNumber
    ) => {

        if (!electives || electives.length === 0) {

            return (
                <div className="text-muted py-3">
                    <i className="bi bi-collection me-2"></i>
                    No elective groups in this semester.
                </div>
            );
        }

        return (
            <div className="row g-3">

                {electives.map(group => (

                    <div
                        className="col-12"
                        key={group.id}
                    >

                        <div className="card border shadow-sm">

                            {/* GROUP HEADER */}

                            <div className="card-body">

                                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3">

                                    <div>

                                        <div className="d-flex align-items-center gap-2 flex-wrap">

                                            <h6 className="fw-bold mb-0">
                                                {
                                                    group.name
                                                }
                                            </h6>

                                            <span className="badge bg-info-subtle text-info-emphasis">
                                                {
                                                    group.electiveType
                                                }
                                            </span>

                                        </div>

                                        <div className="small text-muted mt-2">

                                            <span className="me-3">
                                                <strong>
                                                    L-T-P:
                                                </strong>{" "}
                                                {
                                                    getLTP(
                                                        group
                                                    )
                                                }
                                            </span>

                                            <span>
                                                <strong>
                                                    Credits:
                                                </strong>{" "}
                                                {
                                                    group.credits ??
                                                    0
                                                }
                                            </span>

                                        </div>

                                    </div>


                                    <div className="d-flex gap-2 flex-wrap">

                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary"
                                            onClick={() =>
                                                handleOpenElectiveModal(
                                                    group,
                                                    semesterNumber
                                                )
                                            }
                                        >

                                            <i className="bi bi-check2-square me-1"></i>

                                            Choose Electives

                                        </button>


                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() =>
                                                handleDeleteGroup(
                                                    group,
                                                    semesterNumber
                                                )
                                            }
                                        >

                                            <i className="bi bi-trash me-1"></i>

                                            Delete Group

                                        </button>

                                    </div>

                                </div>


                                {/* SELECTED SUBJECTS */}

                                <div className="mt-4">

                                    <div className="fw-semibold mb-2">

                                        Selected Subjects

                                    </div>


                                    {
                                        group.selectedSubjects &&
                                        group.selectedSubjects.length >
                                            0 ? (

                                            <div className="list-group">

                                                {
                                                    group.selectedSubjects.map(
                                                        subject => (

                                                            <div
                                                                key={
                                                                    subject.id
                                                                }
                                                                className="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"
                                                            >

                                                                <div>

                                                                    <div className="fw-semibold">

                                                                        {
                                                                            subject.courseCode ||
                                                                            "Pending"
                                                                        }

                                                                        {" - "}

                                                                        {
                                                                            subject.courseName
                                                                        }

                                                                    </div>

                                                                    <div className="small text-muted">

                                                                        L-T-P:{" "}

                                                                        {
                                                                            getLTP(
                                                                                subject
                                                                            )
                                                                        }

                                                                        {" • "}

                                                                        Credits:{" "}

                                                                        {
                                                                            subject.credits ??
                                                                            0
                                                                        }

                                                                    </div>

                                                                </div>


                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() =>
                                                                        handleRemoveSelection(
                                                                            group,
                                                                            subject,
                                                                            semesterNumber
                                                                        )
                                                                    }
                                                                >

                                                                    <i className="bi bi-x-lg me-1"></i>

                                                                    Remove

                                                                </button>

                                                            </div>

                                                        )
                                                    )
                                                }

                                            </div>

                                        ) : (

                                            <div className="alert alert-light border mb-0">

                                                <i className="bi bi-info-circle me-2"></i>

                                                No elective subjects selected.

                                            </div>
                                        )
                                    }

                                </div>

                            </div>

                        </div>

                    </div>
                ))}

            </div>
        );
    };


    // =====================================================
    // LOADING SCREEN
    // =====================================================

    if (loadingInitial) {

        return (
            <AdminLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary">
                        </div>

                        <p className="text-muted mt-3 mb-0">
                            Loading...
                        </p>

                    </div>

                </div>

            </AdminLayout>
        );
    }


    // =====================================================
    // MAIN UI
    // =====================================================

    return (

        <AdminLayout>

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-4">

                <h2 className="fw-bold mb-1">
                    Course Structure
                </h2>

                <p className="text-muted mb-0">
                    View and manage the complete curriculum
                    by regulation and department.
                </p>

            </div>


            {/* =================================================
                FILTER CARD
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <div className="row g-3 align-items-end">

                        {/* REGULATION */}

                        <div className="col-12 col-md-5">

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

                                {
                                    regulations.map(
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

                                                {
                                                    regulation.startYear
                                                        ? ` (${regulation.startYear})`
                                                        : ""
                                                }

                                            </option>
                                        )
                                    )
                                }

                            </select>

                        </div>


                        {/* DEPARTMENT */}

                        <div className="col-12 col-md-5">

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

                                {
                                    departments.map(
                                        department => (

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

                                            </option>
                                        )
                                    )
                                }

                            </select>

                        </div>


                        {/* LOAD BUTTON */}

                        <div className="col-12 col-md-2">

                            <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={
                                    handleLoadCurriculum
                                }
                                disabled={
                                    loadingCurriculum
                                }
                            >

                                {
                                    loadingCurriculum ? (

                                        <span
                                            className="spinner-border spinner-border-sm"
                                        ></span>

                                    ) : (

                                        <>
                                            <i className="bi bi-search me-2"></i>
                                            Load
                                        </>

                                    )
                                }

                            </button>

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                CURRICULUM
            ================================================= */}

            {
                loadingCurriculum ? (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="spinner-border text-primary">
                            </div>

                            <p className="text-muted mt-3 mb-0">
                                Loading complete curriculum...
                            </p>

                        </div>

                    </div>

                ) : curriculum ? (

                    <>

                        {/* =================================================
                            CURRICULUM HEADER
                        ================================================= */}

                        <div className="card border-0 shadow-sm mb-4">

                            <div className="card-body">

                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">

                                    <div>

                                        <h5 className="fw-bold mb-1">

                                            {
                                                curriculum.departmentName ||
                                                departmentCode
                                            }

                                        </h5>

                                        <div className="text-muted">

                                            Regulation:{" "}

                                            <strong>
                                                {
                                                    curriculum.regulationCode
                                                }
                                            </strong>

                                            {" • "}

                                            Department:{" "}

                                            <strong>
                                                {
                                                    curriculum.departmentCode
                                                }
                                            </strong>

                                        </div>

                                    </div>


                                    <div className="d-flex gap-2">

                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={
                                                expandAll
                                            }
                                        >

                                            <i className="bi bi-arrows-expand me-1"></i>

                                            Expand All

                                        </button>


                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={
                                                collapseAll
                                            }
                                        >

                                            <i className="bi bi-arrows-collapse me-1"></i>

                                            Collapse All

                                        </button>

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                            ALL SEMESTERS
                        ================================================= */}

                        {
                            (curriculum.semesters || [])
                                .map(
                                    semesterData => {

                                        const semesterNumber =
                                            semesterData.semester;

                                        const isExpanded =
                                            expandedSemesters.includes(
                                                semesterNumber
                                            );

                                        const totals =
                                            getSemesterTotals(
                                                semesterData
                                            );

                                        const courseCount =
                                            (
                                                semesterData.courses ||
                                                []
                                            ).length;

                                        const electiveCount =
                                            (
                                                semesterData.electives ||
                                                []
                                            ).length;


                                        return (

                                            <div
                                                className="card border-0 shadow-sm mb-3"
                                                key={
                                                    semesterNumber
                                                }
                                            >

                                                {/* =================================================
                                                    SEMESTER HEADER
                                                ================================================= */}

                                                <button
                                                    type="button"
                                                    className="btn text-start w-100 p-0 border-0"
                                                    onClick={() =>
                                                        toggleSemester(
                                                            semesterNumber
                                                        )
                                                    }
                                                >

                                                    <div className="card-body">

                                                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">

                                                            <div className="d-flex align-items-center">

                                                                <div
                                                                    className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center me-3"
                                                                    style={{
                                                                        width: "48px",
                                                                        height: "48px",
                                                                        minWidth: "48px"
                                                                    }}
                                                                >

                                                                    <strong>
                                                                        S
                                                                        {
                                                                            semesterNumber
                                                                        }
                                                                    </strong>

                                                                </div>


                                                                <div>

                                                                    <h5 className="fw-bold mb-1">

                                                                        Semester{" "}

                                                                        {
                                                                            semesterNumber
                                                                        }

                                                                    </h5>

                                                                    <div className="small text-muted">

                                                                        {
                                                                            courseCount
                                                                        }

                                                                        {" "}
                                                                        Courses

                                                                        {" • "}

                                                                        {
                                                                            electiveCount
                                                                        }

                                                                        {" "}
                                                                        Elective Groups

                                                                    </div>

                                                                </div>

                                                            </div>


                                                            <div className="d-flex align-items-center gap-3 flex-wrap">

                                                                <span className="badge bg-success-subtle text-success-emphasis">

                                                                    Credits:{" "}

                                                                    {
                                                                        totals.credits
                                                                    }

                                                                </span>


                                                                <span className="badge bg-warning-subtle text-warning-emphasis">

                                                                    L-T-P:{" "}

                                                                    {
                                                                        totals.ltp
                                                                    }

                                                                </span>


                                                                <i
                                                                    className={
                                                                        `bi ${
                                                                            isExpanded
                                                                                ? "bi-chevron-up"
                                                                                : "bi-chevron-down"
                                                                        } fs-5 text-muted`
                                                                    }
                                                                ></i>

                                                            </div>

                                                        </div>

                                                    </div>

                                                </button>


                                                {/* =================================================
                                                    SEMESTER CONTENT
                                                ================================================= */}

                                                {
                                                    isExpanded && (

                                                        <div className="card-body border-top">

                                                            {/* NORMAL COURSES */}

                                                            <div className="mb-4">

                                                                <div className="d-flex align-items-center mb-3">

                                                                    <div
                                                                        className="bg-primary-subtle text-primary rounded-2 d-flex align-items-center justify-content-center me-2"
                                                                        style={{
                                                                            width: "36px",
                                                                            height: "36px"
                                                                        }}
                                                                    >

                                                                        <i className="bi bi-journal-bookmark"></i>

                                                                    </div>

                                                                    <h5 className="fw-bold mb-0">

                                                                        Normal Courses

                                                                    </h5>

                                                                </div>


                                                                {
                                                                    renderCourses(
                                                                        semesterData.courses
                                                                    )
                                                                }

                                                            </div>


                                                            {/* ELECTIVES */}

                                                            <div>

                                                                <div className="d-flex align-items-center mb-3">

                                                                    <div
                                                                        className="bg-warning-subtle text-warning-emphasis rounded-2 d-flex align-items-center justify-content-center me-2"
                                                                        style={{
                                                                            width: "36px",
                                                                            height: "36px"
                                                                        }}
                                                                    >

                                                                        <i className="bi bi-collection"></i>

                                                                    </div>

                                                                    <h5 className="fw-bold mb-0">

                                                                        Electives

                                                                    </h5>

                                                                </div>


                                                                {
                                                                    renderElectives(
                                                                        semesterData.electives,
                                                                        semesterNumber
                                                                    )
                                                                }

                                                            </div>

                                                        </div>
                                                    )
                                                }

                                            </div>
                                        );
                                    }
                                )
                        }

                    </>

                ) : (

                    /* =================================================
                       EMPTY STATE
                    ================================================= */

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <i
                                className="bi bi-journal-text text-muted"
                                style={{
                                    fontSize: "50px"
                                }}
                            ></i>

                            <h5 className="mt-3">
                                View Complete Curriculum
                            </h5>

                            <p className="text-muted mb-0">
                                Select a regulation and department,
                                then click Load to view all 8 semesters.
                            </p>

                        </div>

                    </div>

                )
            }


            {/* =====================================================
                ELECTIVE MODAL
            ===================================================== */}

            {
                showElectiveModal && (

                    <div
                        className="modal d-block"
                        tabIndex="-1"
                        style={{
                            backgroundColor:
                                "rgba(0,0,0,0.5)"
                        }}
                    >

                        <div className="modal-dialog modal-dialog-centered modal-lg">

                            <div className="modal-content border-0 shadow">

                                {/* MODAL HEADER */}

                                <div className="modal-header">

                                    <div>

                                        <h5 className="modal-title fw-bold mb-1">

                                            Choose Elective Subjects

                                        </h5>

                                        {
                                            selectedGroup && (

                                                <div className="small text-muted">

                                                    {
                                                        selectedGroup.name
                                                    }

                                                    {" • "}

                                                    Semester{" "}

                                                    {
                                                        selectedGroup.semesterNumber
                                                    }

                                                </div>

                                            )
                                        }

                                    </div>


                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={
                                            handleCloseElectiveModal
                                        }
                                        disabled={
                                            savingElectives
                                        }
                                    ></button>

                                </div>


                                {/* MODAL BODY */}

                                <div className="modal-body">

                                    {
                                        loadingSubjects ? (

                                            <div className="text-center py-5">

                                                <div className="spinner-border text-primary">
                                                </div>

                                                <p className="text-muted mt-3 mb-0">
                                                    Loading elective subjects...
                                                </p>

                                            </div>

                                        ) : electiveSubjects.length === 0 ? (

                                            <div className="text-center py-5">

                                                <i
                                                    className="bi bi-inbox text-muted"
                                                    style={{
                                                        fontSize: "45px"
                                                    }}
                                                ></i>

                                                <h6 className="mt-3">
                                                    No elective subjects found
                                                </h6>

                                                <p className="text-muted mb-0">
                                                    This elective bucket does not
                                                    contain any subjects.
                                                </p>

                                            </div>

                                        ) : (

                                            <div>

                                                <div className="alert alert-info">

                                                    <i className="bi bi-info-circle me-2"></i>

                                                    Select one or more subjects.
                                                    The elective group's credits
                                                    and L-T-P are counted only once.

                                                </div>


                                                <div className="list-group">

                                                    {
                                                        electiveSubjects.map(
                                                            subject => {

                                                                const isSelected =
                                                                    selectedSubjectIds
                                                                        .includes(
                                                                            subject.id
                                                                        );


                                                                return (

                                                                    <label
                                                                        key={
                                                                            subject.id
                                                                        }
                                                                        className={
                                                                            `list-group-item list-group-item-action ${
                                                                                isSelected
                                                                                    ? "bg-primary-subtle"
                                                                                    : ""
                                                                            }`
                                                                        }
                                                                        style={{
                                                                            cursor:
                                                                                "pointer"
                                                                        }}
                                                                    >

                                                                        <div className="d-flex align-items-center gap-3">

                                                                            <input
                                                                                type="checkbox"
                                                                                className="form-check-input mt-0"
                                                                                checked={
                                                                                    isSelected
                                                                                }
                                                                                onChange={() =>
                                                                                    toggleSubject(
                                                                                        subject.id
                                                                                    )
                                                                                }
                                                                            />


                                                                            <div className="flex-grow-1">

                                                                                <div className="fw-semibold">

                                                                                    {
                                                                                        subject.courseCode ||
                                                                                        "Pending"
                                                                                    }

                                                                                    {" - "}

                                                                                    {
                                                                                        subject.courseName
                                                                                    }

                                                                                </div>


                                                                                <div className="small text-muted">

                                                                                    L-T-P:{" "}

                                                                                    {
                                                                                        getLTP(
                                                                                            subject
                                                                                        )
                                                                                    }

                                                                                    {" • "}

                                                                                    Credits:{" "}

                                                                                    {
                                                                                        subject.credits ??
                                                                                        0
                                                                                    }

                                                                                </div>

                                                                            </div>

                                                                        </div>

                                                                    </label>

                                                                );
                                                            }
                                                        )
                                                    }

                                                </div>

                                            </div>

                                        )
                                    }

                                </div>


                                {/* MODAL FOOTER */}

                                <div className="modal-footer">

                                    <span className="text-muted small me-auto">

                                        {
                                            selectedSubjectIds.length
                                        }

                                        {" "}
                                        selected

                                    </span>


                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={
                                            handleCloseElectiveModal
                                        }
                                        disabled={
                                            savingElectives
                                        }
                                    >
                                        Cancel
                                    </button>


                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={
                                            handleSaveElectives
                                        }
                                        disabled={
                                            loadingSubjects ||
                                            savingElectives
                                        }
                                    >

                                        {
                                            savingElectives ? (

                                                <>
                                                    <span
                                                        className="spinner-border spinner-border-sm me-2"
                                                    ></span>

                                                    Saving...
                                                </>

                                            ) : (

                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Save Selections
                                                </>

                                            )
                                        }

                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                )
            }

        </AdminLayout>
    );
}


export default CourseStructureView;