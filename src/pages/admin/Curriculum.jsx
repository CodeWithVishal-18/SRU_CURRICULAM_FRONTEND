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
    getSemesterCurriculum,
    getElectiveSubjects,
    selectElectives
} from "../../services/curriculumService";


function Curriculum() {

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
    //
    // groupId -> [subjectId, subjectId, ...]
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

    const [subjectsLoading, setSubjectsLoading] =
        useState({});

    const [saving, setSaving] =
        useState(false);


    // =====================================================
    // LOAD REGULATIONS + DEPARTMENTS
    // =====================================================

    useEffect(() => {

        const loadData = async () => {

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

            } catch (error) {

                console.error(error);

                toast.error(
                    "Failed to load regulations or departments"
                );

            } finally {

                setInitialLoading(false);

            }
        };


        loadData();

    }, []);


    // =====================================================
    // LOAD SEMESTER CURRICULUM
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
                    semester
                );
            const curriculum =
                response.data;


            setCourses(
                curriculum?.courses || []
            );


            const groups =
                curriculum?.electives || [];


            setElectives(groups);


            // -------------------------------------------------
            // SET EXISTING SELECTIONS
            //
            // Supports:
            // selectedSubjects: [...]
            //
            // Also supports old:
            // selectedSubject: {...}
            // -------------------------------------------------

            const existingSelections = {};


            groups.forEach((group) => {

                // New response format
                if (
                    Array.isArray(
                        group.selectedSubjects
                    )
                ) {

                    existingSelections[group.id] =
                        group.selectedSubjects.map(
                            subject =>
                                Number(subject.id)
                        );

                }

                // Backward compatibility
                else if (
                    group.selectedSubject
                ) {

                    existingSelections[group.id] = [
                        Number(
                            group.selectedSubject.id
                        )
                    ];

                }

                else {

                    existingSelections[group.id] = [];

                }

            });


            setSelections(
                existingSelections
            );


            // -------------------------------------------------
            // LOAD SUBJECTS
            // -------------------------------------------------

            await loadAllElectiveSubjects(
                groups
            );


        } catch (error) {

            console.error(error);

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
    // LOAD SUBJECTS FOR ALL ELECTIVE GROUPS
    // =====================================================

    const loadAllElectiveSubjects = async (
        groups
    ) => {

        const subjectData = {};


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


                subjectData[group.id] =
                    response.data || [];


            } catch (error) {

                console.error(
                    `Failed to load subjects for group ${group.id}`,
                    error
                );


                subjectData[group.id] = [];


            } finally {

                setSubjectsLoading(
                    previous => ({
                        ...previous,
                        [group.id]: false
                    })
                );

            }
        }


        setSubjects(
            subjectData
        );

    };


    // =====================================================
    // SELECT / DESELECT SUBJECT
    //
    // Multiple subjects allowed
    // =====================================================

    const handleSelectionChange = (
        electiveGroupId,
        subjectId
    ) => {

        const id =
            Number(subjectId);


        setSelections(
            previous => {

                const current =
                    previous[electiveGroupId] || [];


                const alreadySelected =
                    current.includes(id);


                if (alreadySelected) {

                    return {
                        ...previous,

                        [electiveGroupId]:
                            current.filter(
                                selectedId =>
                                    selectedId !== id
                            )
                    };

                }


                return {
                    ...previous,

                    [electiveGroupId]: [
                        ...current,
                        id
                    ]
                };

            }
        );

    };


    // =====================================================
    // CHECK SUBJECT
    // =====================================================

    const isSubjectSelected = (
        groupId,
        subjectId
    ) => {

        return (
            selections[groupId] || []
        ).includes(
            Number(subjectId)
        );

    };


    // =====================================================
    // SUBMIT
    // =====================================================

    const handleSubmit = async () => {

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


        // -------------------------------------------------
        // CREATE COMPLETE SELECTION LIST
        //
        // Multiple subjects per group
        // -------------------------------------------------

        const selectionList = [];


        electives.forEach(
            group => {

                const selected =
                    selections[group.id] || [];


                selected.forEach(
                    subjectId => {

                        selectionList.push({
                            electiveGroupId:
                                group.id,

                            subjectId:
                                subjectId
                        });

                    }
                );

            }
        );


        try {

            setSaving(true);


            const response =
                await selectElectives(
                    regulationCode,
                    departmentCode,
                    semester,
                    selectionList
                );


            toast.success(
                response.message ||
                "Elective selections updated successfully"
            );


            // -------------------------------------------------
            // Reload curriculum
            // -------------------------------------------------

            await handleLoadCurriculum();


        } catch (error) {

            console.error(error);

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
    // TOTAL COURSES
    // =====================================================

    const totalCourses =
        courses.length;


    // =====================================================
    // NORMAL COURSE CREDITS
    // =====================================================

    const totalCourseCredits =
        courses.reduce(
            (total, course) =>
                total +
                (
                    Number(course.credits) || 0
                ),
            0
        );


    // =====================================================
    // SELECTED ELECTIVE GROUPS
    //
    // IMPORTANT:
    //
    // Group L/T/P/C is counted ONCE.
    //
    // Even if:
    //
    // Group A -> 1 subject selected
    // Group A -> 2 subjects selected
    // Group A -> 10 subjects selected
    //
    // The group's slot contribution is counted once.
    // =====================================================

    const selectedElectiveGroups =
        electives.filter(
            group =>
                (
                    selections[group.id] || []
                ).length > 0
        );


    // =====================================================
    // ELECTIVE CREDITS
    // =====================================================

    const totalElectiveCredits =
        selectedElectiveGroups.reduce(
            (total, group) =>
                total +
                (
                    Number(group.credits) || 0
                ),
            0
        );


    // =====================================================
    // TOTAL CREDITS
    // =====================================================

    const totalCredits =
        totalCourseCredits +
        totalElectiveCredits;


    // =====================================================
    // LECTURE
    // =====================================================

    const totalLecture =
        courses.reduce(
            (total, course) =>
                total +
                (
                    Number(course.lecture) || 0
                ),
            0
        )
        +
        selectedElectiveGroups.reduce(
            (total, group) =>
                total +
                (
                    Number(group.lecture) || 0
                ),
            0
        );


    // =====================================================
    // TUTORIAL
    // =====================================================

    const totalTutorial =
        courses.reduce(
            (total, course) =>
                total +
                (
                    Number(course.tutorial) || 0
                ),
            0
        )
        +
        selectedElectiveGroups.reduce(
            (total, group) =>
                total +
                (
                    Number(group.tutorial) || 0
                ),
            0
        );


    // =====================================================
    // PRACTICAL
    // =====================================================

    const totalPractical =
        courses.reduce(
            (total, course) =>
                total +
                (
                    Number(course.practical) || 0
                ),
            0
        )
        +
        selectedElectiveGroups.reduce(
            (total, group) =>
                total +
                (
                    Number(group.practical) || 0
                ),
            0
        );


    // =====================================================
    // L-T-P
    // =====================================================

    const totalLTP =
        `${totalLecture}-${totalTutorial}-${totalPractical}`;


    // =====================================================
    // CATEGORY LABEL
    // =====================================================

    const getCategoryLabel = (
        category
    ) => {

        const labels = {

            CORE:
                "Core",

            ELECTIVE:
                "Elective",

            BASIC_SCIENCE:
                "Basic Science",

            ENGINEERING_SCIENCE:
                "Engineering Science",

            HUMANITIES:
                "Humanities",

            LAB:
                "Lab",

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

    const getLTP = (
        item
    ) => {

        return (
            `${item.lecture ?? 0}-${item.tutorial ?? 0}-${item.practical ?? 0}`
        );

    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <AdminLayout>

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-4">

                <h2 className="fw-bold mb-1">
                    Semester Curriculum
                </h2>

                <p className="text-muted mb-0">
                    View courses and manage elective
                    selections.
                </p>

            </div>


            {/* =================================================
                INITIAL LOADING
            ================================================= */}

            {initialLoading ? (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary"></div>

                        <p className="text-muted mt-3 mb-0">
                            Loading...
                        </p>

                    </div>

                </div>

            ) : (

                <>

                    {/* =================================================
                        FILTERS
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
                                        onChange={(e) => {

                                            setRegulationCode(
                                                e.target.value
                                            );

                                            setCourses([]);
                                            setElectives([]);
                                            setSubjects({});
                                            setSelections({});

                                        }}
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
                                        onChange={(e) => {

                                            setDepartmentCode(
                                                e.target.value
                                            );

                                            setCourses([]);
                                            setElectives([]);
                                            setSubjects({});
                                            setSelections({});

                                        }}
                                    >

                                        <option value="">
                                            Select Department
                                        </option>


                                        {departments.map(
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
                                        onChange={(e) => {

                                            setSemester(
                                                e.target.value
                                            );

                                            setCourses([]);
                                            setElectives([]);
                                            setSubjects({});
                                            setSelections({});

                                        }}
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
                        CURRICULUM
                    ================================================= */}

                    {(courses.length > 0 ||
                        electives.length > 0) && (

                            <>

                                {/* =================================================
                                SUMMARY
                            ================================================= */}

                                <div className="row g-3 mb-4">


                                    {/* TOTAL COURSES */}

                                    <div className="col-12 col-md-4">

                                        <div className="card border-0 shadow-sm">

                                            <div className="card-body">

                                                <small className="text-muted">
                                                    Total Courses
                                                </small>

                                                <h3 className="fw-bold mb-0">
                                                    {totalCourses}
                                                </h3>

                                            </div>

                                        </div>

                                    </div>


                                    {/* TOTAL CREDITS */}

                                    <div className="col-12 col-md-4">

                                        <div className="card border-0 shadow-sm">

                                            <div className="card-body">

                                                <small className="text-muted">
                                                    Total Credits
                                                </small>

                                                <h3 className="fw-bold mb-0">
                                                    {totalCredits}
                                                </h3>

                                            </div>

                                        </div>

                                    </div>


                                    {/* TOTAL LTP */}

                                    <div className="col-12 col-md-4">

                                        <div className="card border-0 shadow-sm">

                                            <div className="card-body">

                                                <small className="text-muted">
                                                    Total L-T-P
                                                </small>

                                                <h3 className="fw-bold mb-0">
                                                    {totalLTP}
                                                </h3>

                                            </div>

                                        </div>

                                    </div>

                                </div>


                                {/* =================================================
                                COURSES
                            ================================================= */}

                                {courses.length > 0 && (

                                    <div className="card border-0 shadow-sm mb-4">

                                        <div className="card-header bg-white py-3">

                                            <h5 className="fw-bold mb-0">
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
                                                            Code
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
                                                        (
                                                            course,
                                                            index
                                                        ) => (

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

                                    <div className="card border-0 shadow-sm">

                                        <div className="card-header bg-white py-3">

                                            <div className="d-flex justify-content-between align-items-center">

                                                <div>

                                                    <h5 className="fw-bold mb-0">
                                                        Electives
                                                    </h5>

                                                    <small className="text-muted">
                                                        You can select multiple
                                                        subjects from an elective
                                                        group.
                                                    </small>

                                                </div>

                                            </div>

                                        </div>


                                        <div className="card-body">


                                            {electives.map(
                                                (group) => {

                                                    const groupSubjects =
                                                        subjects[group.id] ||
                                                        [];


                                                    const loading =
                                                        subjectsLoading[
                                                        group.id
                                                        ];


                                                    const selectedIds =
                                                        selections[
                                                        group.id
                                                        ] || [];


                                                    return (

                                                        <div
                                                            key={
                                                                group.id
                                                            }
                                                            className="border rounded-3 p-3 mb-3"
                                                        >


                                                            {/* GROUP HEADER */}

                                                            <div className="d-flex flex-column flex-md-row justify-content-between mb-3">

                                                                <div>

                                                                    <h6 className="fw-bold mb-1">
                                                                        {
                                                                            group.name
                                                                        }
                                                                    </h6>

                                                                    <small className="text-muted">

                                                                        {
                                                                            group.electiveType
                                                                        }

                                                                        {" • "}

                                                                        L-T-P:
                                                                        {" "}

                                                                        {
                                                                            getLTP(
                                                                                group
                                                                            )
                                                                        }

                                                                        {" • "}

                                                                        Credits:
                                                                        {" "}

                                                                        {
                                                                            group.credits
                                                                        }

                                                                    </small>

                                                                </div>


                                                                {selectedIds.length > 0 && (

                                                                    <span className="badge bg-success-subtle text-success mt-2 mt-md-0">

                                                                        <i className="bi bi-check-circle me-1"></i>

                                                                        {
                                                                            selectedIds.length
                                                                        }

                                                                        {" "}
                                                                        selected

                                                                    </span>

                                                                )}

                                                            </div>


                                                            {/* SUBJECTS */}

                                                            {loading ? (

                                                                <div className="text-muted small">

                                                                    <span
                                                                        className="spinner-border spinner-border-sm me-2"
                                                                    ></span>

                                                                    Loading subjects...

                                                                </div>

                                                            ) : groupSubjects.length === 0 ? (

                                                                <div className="alert alert-light border mb-0">

                                                                    No elective subjects
                                                                    available.

                                                                </div>

                                                            ) : (

                                                                <div className="row g-2">

                                                                    {groupSubjects.map(
                                                                        subject => (

                                                                            <div
                                                                                key={
                                                                                    subject.id
                                                                                }
                                                                                className="col-12 col-md-6"
                                                                            >

                                                                                <div
                                                                                    className={
                                                                                        `form-check border rounded-3 p-3 ps-5 ${isSubjectSelected(
                                                                                            group.id,
                                                                                            subject.id
                                                                                        )
                                                                                            ? "border-primary bg-primary-subtle"
                                                                                            : ""
                                                                                        }`
                                                                                    }
                                                                                >

                                                                                    <input
                                                                                        className="form-check-input"
                                                                                        type="checkbox"
                                                                                        id={
                                                                                            `subject-${group.id}-${subject.id}`
                                                                                        }
                                                                                        checked={
                                                                                            isSubjectSelected(
                                                                                                group.id,
                                                                                                subject.id
                                                                                            )
                                                                                        }
                                                                                        onChange={() =>
                                                                                            handleSelectionChange(
                                                                                                group.id,
                                                                                                subject.id
                                                                                            )
                                                                                        }
                                                                                    />


                                                                                    <label
                                                                                        className="form-check-label w-100"
                                                                                        htmlFor={
                                                                                            `subject-${group.id}-${subject.id}`
                                                                                        }
                                                                                        style={{
                                                                                            cursor:
                                                                                                "pointer"
                                                                                        }}
                                                                                    >

                                                                                        <div className="fw-semibold">

                                                                                            {
                                                                                                subject.courseCode
                                                                                            }

                                                                                            {" - "}

                                                                                            {
                                                                                                subject.courseName
                                                                                            }

                                                                                        </div>


                                                                                        <small className="text-muted">

                                                                                            L-T-P:
                                                                                            {" "}

                                                                                            {
                                                                                                getLTP(
                                                                                                    subject
                                                                                                )
                                                                                            }

                                                                                            {" • "}

                                                                                            Credits:
                                                                                            {" "}

                                                                                            {
                                                                                                subject.credits
                                                                                            }

                                                                                        </small>

                                                                                    </label>

                                                                                </div>

                                                                            </div>

                                                                        )
                                                                    )}

                                                                </div>

                                                            )}

                                                        </div>

                                                    );

                                                }
                                            )}

                                        </div>


                                        {/* =================================================
                                        SUBMIT
                                    ================================================= */}

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
                                        No curriculum found
                                    </h5>


                                    <p className="text-muted mb-0">
                                        No courses or electives
                                        were found for the
                                        selected semester.
                                    </p>

                                </div>

                            </div>

                        )}

                </>

            )}

        </AdminLayout>

    );

}


export default Curriculum;