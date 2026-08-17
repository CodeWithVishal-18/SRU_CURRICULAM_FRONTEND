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
    uploadCourseStructure
} from "../../services/courseStructureService";


function CourseStructure() {

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

    const [file, setFile] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [uploading, setUploading] =
        useState(false);

    // =====================================================
    // LOAD REGULATIONS + DEPARTMENTS
    // =====================================================

    useEffect(() => {

        const loadData = async () => {

            try {

                setLoading(true);

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

                setLoading(false);
            }
        };

        loadData();

    }, []);

    // =====================================================
    // FILE CHANGE
    // =====================================================

    const handleFileChange = (event) => {

        const selectedFile =
            event.target.files[0];

        if (!selectedFile) {
            return;
        }

        const fileName =
            selectedFile.name.toLowerCase();

        const isExcel =
            fileName.endsWith(".xlsx") ||
            fileName.endsWith(".xls");

        if (!isExcel) {

            toast.error(
                "Please select an Excel file (.xlsx or .xls)"
            );

            event.target.value = "";

            setFile(null);

            return;
        }

        setFile(selectedFile);
    };

    // =====================================================
    // UPLOAD
    // =====================================================

    const handleUpload = async (event) => {

        event.preventDefault();

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

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

        if (!file) {

            toast.error(
                "Please select an Excel file"
            );

            return;
        }

        try {

            setUploading(true);

            const response =
                await uploadCourseStructure(
                    regulationCode,
                    departmentCode,
                    file
                );

            toast.success(
                response.message ||
                "Course structure uploaded successfully"
            );

            // Clear file after successful upload
            setFile(null);

            const fileInput =
                document.getElementById(
                    "courseStructureFile"
                );

            if (fileInput) {
                fileInput.value = "";
            }

        } catch (error) {

            console.error(
                "Course structure upload failed:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to upload course structure"
            );

        } finally {

            setUploading(false);
        }
    };

    // =====================================================
    // SELECTED REGULATION
    // =====================================================

    const selectedRegulation =
        regulations.find(
            (regulation) =>
                regulation.code ===
                regulationCode
        );

    // =====================================================
    // SELECTED DEPARTMENT
    // =====================================================

    const selectedDepartment =
        departments.find(
            (department) =>
                department.code ===
                departmentCode
        );

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
                    Upload and manage academic
                    course structures.
                </p>

            </div>


            {/* =================================================
                MAIN CARD
            ================================================= */}

            <div className="row justify-content-center">

                <div className="col-12 col-xl-9">

                    <div className="card border-0 shadow-sm">

                        <div className="card-body p-4 p-lg-5">

                            {/* =================================================
                                TITLE
                            ================================================= */}

                            <div className="d-flex align-items-center mb-4">

                                <div
                                    className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center me-3"
                                    style={{
                                        width: "50px",
                                        height: "50px"
                                    }}
                                >

                                    <i className="bi bi-file-earmark-spreadsheet fs-4"></i>

                                </div>

                                <div>

                                    <h5 className="fw-bold mb-1">
                                        Upload Course Structure
                                    </h5>

                                    <p className="text-muted small mb-0">
                                        Select the regulation,
                                        department and Excel file.
                                    </p>

                                </div>

                            </div>


                            {loading ? (

                                <div className="text-center py-5">

                                    <div
                                        className="spinner-border text-primary"
                                    ></div>

                                    <p className="text-muted mt-3 mb-0">
                                        Loading regulations
                                        and departments...
                                    </p>

                                </div>

                            ) : (

                                <form
                                    onSubmit={
                                        handleUpload
                                    }
                                >

                                    {/* =============================================
                                        REGULATION + DEPARTMENT
                                    ============================================= */}

                                    <div className="row g-4">

                                        {/* REGULATION */}

                                        <div className="col-12 col-md-6">

                                            <label className="form-label fw-semibold">

                                                Regulation

                                                <span className="text-danger">
                                                    {" "}*
                                                </span>

                                            </label>

                                            <select
                                                className="form-select form-select-lg"
                                                value={
                                                    regulationCode
                                                }
                                                onChange={(event) =>
                                                    setRegulationCode(
                                                        event.target.value
                                                    )
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

                                        <div className="col-12 col-md-6">

                                            <label className="form-label fw-semibold">

                                                Department

                                                <span className="text-danger">
                                                    {" "}*
                                                </span>

                                            </label>

                                            <select
                                                className="form-select form-select-lg"
                                                value={
                                                    departmentCode
                                                }
                                                onChange={(event) =>
                                                    setDepartmentCode(
                                                        event.target.value
                                                    )
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

                                    </div>


                                    {/* =============================================
                                        SELECTION SUMMARY
                                    ============================================= */}

                                    {(selectedRegulation ||
                                        selectedDepartment) && (

                                        <div className="alert alert-light border mt-4">

                                            <div className="d-flex align-items-start">

                                                <i className="bi bi-info-circle text-primary me-2 mt-1"></i>

                                                <div>

                                                    <div className="fw-semibold mb-1">
                                                        Upload Target
                                                    </div>

                                                    <small className="text-muted">

                                                        {selectedRegulation
                                                            ? `Regulation: ${selectedRegulation.code}`
                                                            : "Regulation not selected"
                                                        }

                                                        {" • "}

                                                        {selectedDepartment
                                                            ? `Department: ${selectedDepartment.code}`
                                                            : "Department not selected"
                                                        }

                                                    </small>

                                                </div>

                                            </div>

                                        </div>

                                    )}


                                    {/* =============================================
                                        FILE UPLOAD
                                    ============================================= */}

                                    <div className="mt-4">

                                        <label className="form-label fw-semibold">

                                            Course Structure Excel

                                            <span className="text-danger">
                                                {" "}*
                                            </span>

                                        </label>


                                        <label
                                            htmlFor="courseStructureFile"
                                            className="d-block border rounded-4 p-5 text-center"
                                            style={{
                                                cursor: "pointer",
                                                borderStyle: "dashed",
                                                backgroundColor: "#f8f9fa"
                                            }}
                                        >

                                            <i
                                                className="bi bi-cloud-arrow-up text-primary"
                                                style={{
                                                    fontSize: "50px"
                                                }}
                                            ></i>


                                            {file ? (

                                                <>

                                                    <h6 className="fw-semibold mt-3 mb-1">

                                                        {file.name}

                                                    </h6>

                                                    <small className="text-success">

                                                        <i className="bi bi-check-circle me-1"></i>

                                                        File selected

                                                    </small>

                                                </>

                                            ) : (

                                                <>

                                                    <h6 className="fw-semibold mt-3 mb-1">
                                                        Select Excel File
                                                    </h6>

                                                    <p className="text-muted small mb-0">
                                                        .xlsx or .xls
                                                    </p>

                                                </>

                                            )}

                                            <input
                                                id="courseStructureFile"
                                                type="file"
                                                className="d-none"
                                                accept=".xlsx,.xls"
                                                onChange={
                                                    handleFileChange
                                                }
                                            />

                                        </label>

                                    </div>


                                    {/* =============================================
                                        UPLOAD BUTTON
                                    ============================================= */}

                                    <div className="d-flex justify-content-end mt-4">

                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-lg px-4"
                                            disabled={
                                                uploading
                                            }
                                        >

                                            {uploading ? (

                                                <>

                                                    <span
                                                        className="spinner-border spinner-border-sm me-2"
                                                    ></span>

                                                    Uploading...

                                                </>

                                            ) : (

                                                <>

                                                    <i className="bi bi-cloud-arrow-up me-2"></i>

                                                    Upload Course Structure

                                                </>

                                            )}

                                        </button>

                                    </div>

                                </form>

                            )}

                        </div>

                    </div>


                    {/* =================================================
                        INFORMATION CARD
                    ================================================= */}

                    <div className="card border-0 shadow-sm mt-4">

                        <div className="card-body p-4">

                            <h6 className="fw-bold mb-3">

                                <i className="bi bi-info-circle text-primary me-2"></i>

                                Upload Guidelines

                            </h6>

                            <ul className="text-muted small mb-0">

                                <li className="mb-2">
                                    Select the correct regulation
                                    before uploading.
                                </li>

                                <li className="mb-2">
                                    Select the department that
                                    owns the course structure.
                                </li>

                                <li className="mb-2">
                                    Upload the Excel file containing
                                    the course structure.
                                </li>

                                <li>
                                    Existing courses will be
                                    updated according to the
                                    backend course structure logic.
                                </li>

                            </ul>

                        </div>

                    </div>

                </div>

            </div>

        </AdminLayout>
    );
}

export default CourseStructure;