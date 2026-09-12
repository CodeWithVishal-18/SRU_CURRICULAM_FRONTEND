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
    selectElectives,
    uploadCourseSyllabus,
    uploadElectiveSubjectSyllabus,
    getSyllabusFileUrl,
    updateSyllabusStatus
} from "../../services/curriculumService";

import api from "../../services/api";


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
    // ADMIN SYLLABUS REVIEW MODAL
    // =====================================================

    const [selectedSyllabusItem, setSelectedSyllabusItem] =
        useState(null);

    const [selectedSyllabusType, setSelectedSyllabusType] =
        useState("course");

    const [selectedSyllabusFile, setSelectedSyllabusFile] =
        useState(null);

    const [syllabusRemarks, setSyllabusRemarks] =
        useState("");

    const [syllabusUploading, setSyllabusUploading] =
        useState(false);

    const [syllabusStatusUpdating, setSyllabusStatusUpdating] =
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
    // ADMIN SYLLABUS HELPERS
    // =====================================================

    const getSyllabusObject = (item) =>
        item?.syllabus || item?.syllabusDetails || item?.syllabusFile || null;

    const getSyllabusId = (item) => {
        const syllabus = getSyllabusObject(item);
        return syllabus?.id || syllabus?.syllabusId || item?.syllabusId || item?.syllabusID || null;
    };

    const getSyllabusStatus = (item) => {
        const syllabus = getSyllabusObject(item);
        return String(
            syllabus?.status || item?.syllabusStatus || item?.status || "NOT_UPLOADED"
        ).toUpperCase();
    };

    const getSyllabusStatusLabel = (status) => {
        const labels = {
            NOT_UPLOADED: "Not Uploaded",
            UPLOADED: "Uploaded",
            SUBMITTED: "Submitted",
            PENDING: "Pending Review",
            UNDER_REVIEW: "Under Review",
            APPROVED: "Approved",
            REJECTED: "Rejected"
        };
        return labels[String(status || "").toUpperCase()] || String(status || "Not Uploaded").replaceAll("_", " ");
    };

    const getSyllabusStatusClass = (status) => {
        const value = String(status || "").toUpperCase();
        if (value === "APPROVED") return "bg-success-subtle text-success";
        if (value === "REJECTED") return "bg-danger-subtle text-danger";
        if (["PENDING", "SUBMITTED", "UNDER_REVIEW"].includes(value)) return "bg-warning-subtle text-warning-emphasis";
        if (value === "UPLOADED") return "bg-info-subtle text-info";
        return "bg-secondary-subtle text-secondary";
    };

    const openSyllabusEditor = (item, type = "course") => {
        const syllabus = getSyllabusObject(item);
        setSelectedSyllabusItem(item);
        setSelectedSyllabusType(type);
        setSelectedSyllabusFile(null);
        setSyllabusRemarks(syllabus?.remarks || syllabus?.reviewerComment || item?.remarks || "");
    };

    const closeSyllabusEditor = () => {
        setSelectedSyllabusItem(null);
        setSelectedSyllabusType("course");
        setSelectedSyllabusFile(null);
        setSyllabusRemarks("");
    };

    const handleViewSyllabus = async (item) => {
        const syllabusId = getSyllabusId(item);
        if (!syllabusId) {
            toast.error("Syllabus has not been uploaded yet");
            return;
        }
        try {
            const response = await api.get(getSyllabusFileUrl(syllabusId), { responseType: "blob" });
            const blobUrl = window.URL.createObjectURL(response.data);
            window.open(blobUrl, "_blank");
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
            console.error("View syllabus error:", error);
            toast.error("Unable to open syllabus");
        }
    };

    const updateCourseState = (updatedItem) => {
        setCourses((previous) => previous.map((course) =>
            Number(course.id) === Number(updatedItem.id) ? { ...course, ...updatedItem } : course
        ));
    };

    const updateElectiveSubjectState = (updatedItem) => {
        setSubjects((previous) => {
            const next = { ...previous };
            Object.keys(next).forEach((groupId) => {
                next[groupId] = (next[groupId] || []).map((subject) =>
                    Number(subject.id) === Number(updatedItem.id) ? { ...subject, ...updatedItem } : subject
                );
            });
            return next;
        });
    };

    const handleSyllabusFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Only PDF, DOC, and DOCX files are allowed");
            event.target.value = "";
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size must be less than 10 MB");
            event.target.value = "";
            return;
        }
        setSelectedSyllabusFile(file);
    };

    const handleAdminSyllabusUpload = async () => {
        if (!selectedSyllabusFile) {
            toast.error("Please select a syllabus file");
            return;
        }
        if (!selectedSyllabusItem?.id) {
            toast.error("Unable to identify the selected course");
            return;
        }
        try {
            setSyllabusUploading(true);
            const response = selectedSyllabusType === "elective"
                ? await uploadElectiveSubjectSyllabus(selectedSyllabusItem.id, selectedSyllabusFile)
                : await uploadCourseSyllabus(selectedSyllabusItem.id, selectedSyllabusFile);
            const uploaded = response?.data || response || {};
            const updatedItem = {
                ...selectedSyllabusItem,
                syllabusId: uploaded.id || uploaded.syllabusId || selectedSyllabusItem.syllabusId,
                syllabusStatus: uploaded.status || "PENDING",
                syllabus: uploaded.id || uploaded.syllabusId ? uploaded : selectedSyllabusItem.syllabus
            };
            if (selectedSyllabusType === "elective") updateElectiveSubjectState(updatedItem);
            else updateCourseState(updatedItem);
            setSelectedSyllabusItem(updatedItem);
            setSelectedSyllabusFile(null);
            const input = document.getElementById("admin-syllabus-file");
            if (input) input.value = "";
            toast.success("Syllabus uploaded successfully");
        } catch (error) {
            console.error("Admin syllabus upload error:", error);
            toast.error(error.response?.data?.message || "Failed to upload syllabus");
        } finally {
            setSyllabusUploading(false);
        }
    };

    const handleAdminSyllabusStatus = async (status) => {
        const syllabusId = getSyllabusId(selectedSyllabusItem);
        if (!syllabusId) {
            toast.error("Upload a syllabus before changing its status");
            return;
        }
        if (status === "REJECTED" && !syllabusRemarks.trim()) {
            toast.error("Please enter a reviewer comment before rejecting");
            return;
        }
        try {
            setSyllabusStatusUpdating(true);
            const response = await updateSyllabusStatus(syllabusId, status, syllabusRemarks);
            const updated = response?.data || response || {};
            const updatedItem = {
                ...selectedSyllabusItem,
                syllabusStatus: updated.status || status,
                syllabus: {
                    ...(getSyllabusObject(selectedSyllabusItem) || {}),
                    ...updated,
                    status: updated.status || status,
                    remarks: syllabusRemarks
                }
            };
            if (selectedSyllabusType === "elective") updateElectiveSubjectState(updatedItem);
            else updateCourseState(updatedItem);
            setSelectedSyllabusItem(updatedItem);
            toast.success(status === "APPROVED" ? "Syllabus approved successfully" : "Syllabus rejected successfully");
        } catch (error) {
            console.error("Syllabus status update error:", error);
            toast.error(error.response?.data?.message || "Failed to update syllabus status");
        } finally {
            setSyllabusStatusUpdating(false);
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
        <>

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

                                                            <th className="text-center">
                                                                Actions
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

                                                                    <td className="text-center">
                                                                        <div className="d-flex justify-content-center gap-2 flex-wrap">
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-primary"
                                                                                onClick={() => openSyllabusEditor(course, "course")}
                                                                            >
                                                                                <i className="bi bi-pencil-square me-1"></i>
                                                                                Edit
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-outline-secondary"
                                                                                onClick={() => handleViewSyllabus(course)}
                                                                                disabled={!getSyllabusId(course)}
                                                                            >
                                                                                <i className="bi bi-eye me-1"></i>
                                                                                View
                                                                            </button>
                                                                        </div>
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



                                                                                            <div className="d-flex gap-2 mt-3">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="btn btn-sm btn-primary"
                                                                                                    onClick={(event) => {
                                                                                                        event.preventDefault();
                                                                                                        event.stopPropagation();
                                                                                                        openSyllabusEditor(subject, "elective");
                                                                                                    }}
                                                                                                >
                                                                                                    <i className="bi bi-pencil-square me-1"></i>
                                                                                                    Edit
                                                                                                </button>

                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="btn btn-sm btn-outline-secondary"
                                                                                                    onClick={(event) => {
                                                                                                        event.preventDefault();
                                                                                                        event.stopPropagation();
                                                                                                        handleViewSyllabus(subject);
                                                                                                    }}
                                                                                                    disabled={!getSyllabusId(subject)}
                                                                                                >
                                                                                                    <i className="bi bi-eye me-1"></i>
                                                                                                    View
                                                                                                </button>
                                                                                            </div>
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


        // {/* =====================================================
        //     ADMIN SYLLABUS EDIT / REVIEW MODAL
        // ===================================================== */}

            {
                selectedSyllabusItem && (
                    <>
                        <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>

                        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1050, backgroundColor: "rgba(0, 0, 0, 0.15)" }}>
                            <div className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
                                <div className="modal-content rounded-4 border-0 shadow">
                                    <div className="modal-header border-0 px-4 pt-4 pb-2">
                                        <div className="pe-4">
                                            <h2 className="fw-bold mb-2">
                                                {selectedSyllabusItem.courseName || selectedSyllabusItem.subjectName || selectedSyllabusItem.title || "Course Details"}
                                            </h2>
                                            <div className="text-muted small">
                                                {regulationCode || "—"}
                                                <span className="mx-2">·</span>
                                                {departmentCode || "—"}
                                                <span className="mx-2">·</span>
                                                Sem {semester || "—"}
                                                <span className="mx-2">·</span>
                                                {selectedSyllabusItem.courseCode || selectedSyllabusItem.subjectCode || "—"}
                                            </div>
                                        </div>
                                        <button type="button" className="btn-close" onClick={closeSyllabusEditor} aria-label="Close"></button>
                                    </div>

                                    <div className="modal-body px-4 pb-4">
                                        <div className="row g-4 mb-4">
                                            <div className="col-md-8">
                                                <label className="form-label fw-bold text-uppercase small text-secondary">Course Title</label>
                                                <input type="text" className="form-control form-control-lg" value={selectedSyllabusItem.courseName || selectedSyllabusItem.subjectName || selectedSyllabusItem.title || ""} readOnly />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold text-uppercase small text-secondary">Course Code</label>
                                                <input type="text" className="form-control form-control-lg" value={selectedSyllabusItem.courseCode || selectedSyllabusItem.subjectCode || ""} readOnly />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold text-uppercase small text-secondary">Department</label>
                                                <input type="text" className="form-control form-control-lg" value={departmentCode || ""} readOnly />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold text-uppercase small text-secondary">Current Status</label>
                                                <div className="form-control form-control-lg bg-light d-flex align-items-center">
                                                    <span className={`badge ${getSyllabusStatusClass(getSyllabusStatus(selectedSyllabusItem))} px-3 py-2`}>
                                                        {getSyllabusStatusLabel(getSyllabusStatus(selectedSyllabusItem))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <hr />

                                        <div className="mt-4">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h4 className="fw-bold mb-0">Syllabus</h4>
                                                <span className={`badge ${getSyllabusStatusClass(getSyllabusStatus(selectedSyllabusItem))} px-3 py-2`}>
                                                    {getSyllabusStatusLabel(getSyllabusStatus(selectedSyllabusItem))}
                                                </span>
                                            </div>

                                            {getSyllabusId(selectedSyllabusItem) ? (
                                                <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2">
                                                    <div>
                                                        Current file: <strong>{getSyllabusObject(selectedSyllabusItem)?.fileName || getSyllabusObject(selectedSyllabusItem)?.originalFileName || selectedSyllabusItem.fileName || "Syllabus file"}</strong>
                                                    </div>
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleViewSyllabus(selectedSyllabusItem)}>
                                                        <i className="bi bi-eye me-1"></i>
                                                        View / Download
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="alert alert-secondary">No syllabus has been uploaded yet.</div>
                                            )}

                                            <label htmlFor="admin-syllabus-file" className="border rounded-3 p-4 text-center d-block" style={{ cursor: "pointer", borderStyle: "dashed", backgroundColor: "#fcfbf7" }}>
                                                <i className="bi bi-cloud-arrow-up fs-2 text-primary"></i>
                                                <div className="mt-2 text-muted">
                                                    {selectedSyllabusFile ? selectedSyllabusFile.name : "Click to upload or replace syllabus"}
                                                </div>
                                                <small className="text-muted">Supported formats: PDF, DOC, DOCX. Maximum size 10 MB.</small>
                                            </label>

                                            <input id="admin-syllabus-file" type="file" className="d-none" accept=".pdf,.doc,.docx" onChange={handleSyllabusFileChange} />

                                            <button type="button" className="btn btn-primary mt-3" onClick={handleAdminSyllabusUpload} disabled={syllabusUploading || !selectedSyllabusFile}>
                                                {syllabusUploading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-upload me-2"></i>
                                                        {getSyllabusId(selectedSyllabusItem) ? "Replace Syllabus" : "Upload Syllabus"}
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <hr className="my-4" />

                                        <div className="mb-4">
                                            <label className="form-label fw-bold text-uppercase small text-secondary">Reviewer Comment</label>
                                            <textarea className="form-control" rows="4" placeholder="Write a comment for approval or rejection..." value={syllabusRemarks} onChange={(event) => setSyllabusRemarks(event.target.value)}></textarea>
                                        </div>

                                        <div className="d-flex flex-wrap gap-2">
                                            <button type="button" className="btn btn-success px-4" onClick={() => handleAdminSyllabusStatus("APPROVED")} disabled={syllabusStatusUpdating || !getSyllabusId(selectedSyllabusItem) || getSyllabusStatus(selectedSyllabusItem) === "APPROVED"}>
                                                {syllabusStatusUpdating ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check-circle me-2"></i>}
                                                Approve
                                            </button>
                                            <button type="button" className="btn btn-danger px-4" onClick={() => handleAdminSyllabusStatus("REJECTED")} disabled={syllabusStatusUpdating || !getSyllabusId(selectedSyllabusItem) || getSyllabusStatus(selectedSyllabusItem) === "REJECTED"}>
                                                {syllabusStatusUpdating ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-x-circle me-2"></i>}
                                                Reject
                                            </button>
                                            <button type="button" className="btn btn-outline-secondary px-4 ms-md-auto" onClick={closeSyllabusEditor}>Close</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            }
        </>

    );

}


export default Curriculum;