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
    getCoursesBySemester
} from "../../services/courseService";


function CourseStructureView() {

    // =====================================================
    // STATE
    // =====================================================

    const [regulations, setRegulations] =
        useState([]);

    const [departments, setDepartments] =
        useState([]);

    const [courses, setCourses] =
        useState([]);

    const [regulationCode, setRegulationCode] =
        useState("");

    const [departmentCode, setDepartmentCode] =
        useState("");

    const [semester, setSemester] =
        useState("");

    const [loadingInitial, setLoadingInitial] =
        useState(true);

    const [loadingCourses, setLoadingCourses] =
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
                    "Failed to load data:",
                    error
                );

                toast.error(
                    "Failed to load regulations or departments"
                );

            } finally {

                setLoadingInitial(false);
            }
        };

        loadInitialData();

    }, []);


    // =====================================================
    // FETCH COURSES
    // =====================================================

    const handleViewCourses = async () => {

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

            setLoadingCourses(true);

            const response =
                await getCoursesBySemester(
                    regulationCode,
                    departmentCode,
                    semester
                );

            setCourses(
                response.data || []
            );

        } catch (error) {

            console.error(
                "Failed to fetch courses:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to load courses"
            );

            setCourses([]);

        } finally {

            setLoadingCourses(false);
        }
    };


    // =====================================================
    // RESET COURSES WHEN REGULATION CHANGES
    // =====================================================

    const handleRegulationChange = (event) => {

        setRegulationCode(
            event.target.value
        );

        setCourses([]);
    };


    // =====================================================
    // RESET COURSES WHEN DEPARTMENT CHANGES
    // =====================================================

    const handleDepartmentChange = (event) => {

        setDepartmentCode(
            event.target.value
        );

        setCourses([]);
    };


    // =====================================================
    // RESET COURSES WHEN SEMESTER CHANGES
    // =====================================================

    const handleSemesterChange = (event) => {

        setSemester(
            event.target.value
        );

        setCourses([]);
    };


    // =====================================================
    // CATEGORY LABEL
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
            BASIC_SCIENCE: "Basic Science",
            ENGINEERING_SCIENCE:
                "Engineering Science",
            HUMANITIES: "Humanities",
            LAB: "Lab",
            PROJECT: "Project",
            OTHER: "Other"
        };

        return (
            <span className="badge bg-primary-subtle text-primary">
                {categoryNames[category] ||
                    category}
            </span>
        );
    };


    // =====================================================
    // L-T-P DISPLAY
    // =====================================================

    const getLTP = (course) => {

        const lecture =
            course.lecture ?? 0;

        const tutorial =
            course.tutorial ?? 0;

        const practical =
            course.practical ?? 0;

        return `${lecture}-${tutorial}-${practical}`;
    };

    // =====================================================
    // SEMESTER SUMMARY
    // =====================================================

    const totalCourses = courses.length;

    const totalCredits = courses.reduce(
        (total, course) =>
            total + (Number(course.credits) || 0),
        0
    );

    const totalLecture = courses.reduce(
        (total, course) =>
            total + (Number(course.lecture) || 0),
        0
    );

    const totalTutorial = courses.reduce(
        (total, course) =>
            total + (Number(course.tutorial) || 0),
        0
    );

    const totalPractical = courses.reduce(
        (total, course) =>
            total + (Number(course.practical) || 0),
        0
    );

    const totalLTP =
        `${totalLecture}-${totalTutorial}-${totalPractical}`;


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
                    View courses by regulation,
                    department and semester.
                </p>

            </div>


            {loadingInitial ? (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div
                            className="spinner-border text-primary"
                        ></div>

                        <p className="text-muted mt-3 mb-0">
                            Loading...
                        </p>

                    </div>

                </div>

            ) : (

                <>

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
                                            (regulation) => (

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

                                                    {regulation.startYear
                                                        ? ` (${regulation.startYear})`
                                                        : ""
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
                                            (department) => (

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
                                                (sem) => (

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


                                {/* BUTTON */}

                                <div className="col-12 col-md-2">

                                    <button
                                        className="btn btn-primary w-100"
                                        onClick={
                                            handleViewCourses
                                        }
                                        disabled={
                                            loadingCourses
                                        }
                                    >

                                        {loadingCourses ? (

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
                        COURSE RESULTS
                    ================================================= */}
                    {/* =================================================
    SEMESTER SUMMARY
================================================= */}

                    <div className="row g-3 mb-4">

                        {/* TOTAL COURSES */}

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

                                            <div className="text-muted small">
                                                Total Courses
                                            </div>

                                            <div className="fs-4 fw-bold">
                                                {totalCourses}
                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* TOTAL CREDITS */}

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

                                            <div className="text-muted small">
                                                Total Credits
                                            </div>

                                            <div className="fs-4 fw-bold">
                                                {totalCredits}
                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* TOTAL L-T-P */}

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

                                            <div className="text-muted small">
                                                Total L-T-P
                                            </div>

                                            <div className="fs-4 fw-bold">
                                                {totalLTP}
                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                    {courses.length > 0 ? (

                        <div className="card border-0 shadow-sm">

                            {/* CARD HEADER */}

                            <div className="card-body border-bottom">

                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">

                                    <div>

                                        <h5 className="fw-bold mb-1">

                                            Semester {semester}

                                        </h5>

                                        <p className="text-muted small mb-0">

                                            {regulationCode}
                                            {" • "}
                                            {departmentCode}

                                        </p>

                                    </div>

                                    <span className="badge bg-primary-subtle text-primary mt-2 mt-md-0">

                                        {courses.length}
                                        {" "}
                                        Courses

                                    </span>

                                </div>

                            </div>


                            {/* TABLE */}

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

                                                    <td>

                                                        <span className="fw-semibold">
                                                            {
                                                                course.courseCode
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
                                                                course.credits
                                                            }
                                                        </span>

                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    ) : (

                        !loadingCourses &&
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
                                        No courses found
                                    </h5>

                                    <p className="text-muted mb-0">
                                        No courses were found
                                        for the selected
                                        semester.
                                    </p>

                                </div>

                            </div>

                        )

                    )}

                </>

            )}

        </AdminLayout>
    );
}

export default CourseStructureView;