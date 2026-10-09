import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import AdminLayout from "../../layouts/AdminLayout";
import { getAllRegulations } from "../../services/regulationService";
import { getAllDepartments } from "../../services/departmentService";
import { getAllPrograms } from "../../services/programService";
import { uploadCourseStructure } from "../../services/courseStructureService";

function CourseStructure() {
    const [regulations, setRegulations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]);
    const [regulationCode, setRegulationCode] = useState("");
    const [departmentCode, setDepartmentCode] = useState("");
    const [programCode, setProgramCode] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [regRes, deptRes, progRes] = await Promise.all([
                    getAllRegulations(),
                    getAllDepartments(),
                    getAllPrograms().catch(() => ({ data: [] })),
                ]);
                setRegulations(regRes?.data || []);
                setDepartments(deptRes?.data || []);
                setAllPrograms(progRes?.data || []);
            } catch (error) {
                toast.error("Failed to load regulations, departments or programs");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Active regulation object
    const selectedRegulation = useMemo(
        () => regulations.find((r) => r.code === regulationCode),
        [regulations, regulationCode]
    );

    // Filter programmes based on Department AND the Level defined by the chosen Regulation
    const filteredPrograms = useMemo(() => {
        if (!departmentCode || !selectedRegulation) return [];
        const normDept = departmentCode.trim().toUpperCase();
        const regLevel = selectedRegulation.level || "UG";
        return allPrograms.filter(
            (p) =>
                (p.departmentCode || "").toUpperCase() === normDept &&
                (p.level || "UG").toUpperCase() === regLevel.toUpperCase()
        );
    }, [departmentCode, selectedRegulation, allPrograms]);
    const selectedProgram = useMemo(
        () => allPrograms.find((p) => p.code === programCode),
        [allPrograms, programCode]
    );

    const handleRegulationChange = (e) => {
        setRegulationCode(e.target.value);
        setProgramCode("");
    };

    const handleDepartmentChange = (e) => {
        setDepartmentCode(e.target.value);
        setProgramCode("");
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        const name = selected.name.toLowerCase();
        if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
            toast.error("Please select an Excel file (.xlsx or .xls)");
            e.target.value = "";
            setFile(null);
            return;
        }
        setFile(selected);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!regulationCode) {
            toast.error("Please select a regulation");
            return;
        }
        if (!departmentCode) {
            toast.error("Please select a department");
            return;
        }
        if (!programCode) {
            toast.error("Please select a degree programme");
            return;
        }
        if (!file) {
            toast.error("Please select an Excel file");
            return;
        }
        try {
            setUploading(true);
            const level = selectedRegulation?.level || "UG";
            const response = await uploadCourseStructure(
                regulationCode,
                departmentCode,
                level,
                programCode,
                file
            );
            toast.success(response?.message || "Course structure uploaded successfully");
            setFile(null);
            const input = document.getElementById("courseStructureFile");
            if (input) input.value = "";
        } catch (error) {
            toast.error(error.response?.data?.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="mb-4">
                <h2 className="fw-bold mb-1">Course Structure</h2>
                <p className="text-muted mb-0">
                    Upload curriculum Excel sheets linked to regulation, department, and degree programme.
                </p>
            </div>
            <div className="card border-0 shadow-sm col-xl-10 mx-auto">
                <div className="card-body p-4 p-lg-5">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary"></div>
                            <p className="text-muted mt-2">Loading...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpload}>
                            <div className="row g-4">
                                {/* 1. REGULATION */}
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-semibold">
                                        Regulation <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select form-select-lg"
                                        value={regulationCode}
                                        onChange={handleRegulationChange}
                                        required
                                    >
                                        <option value="">Select Regulation</option>
                                        {regulations.map((r) => (
                                            <option key={r.code} value={r.code}>
                                                {r.code} ({r.level || "UG"}) - {r.startYear}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. DEPARTMENT */}
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-semibold">
                                        Department <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select form-select-lg"
                                        value={departmentCode}
                                        onChange={handleDepartmentChange}
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map((d) => (
                                            <option key={d.code} value={d.code}>
                                                {d.name} ({d.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. DEGREE PROGRAMME (WITH SPECIALIZATION) */}
                                <div className="col-12">
                                    <label className="form-label fw-semibold">
                                        Degree Programme <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select form-select-lg"
                                        value={programCode}
                                        onChange={(e) => setProgramCode(e.target.value)}
                                        disabled={!regulationCode || !departmentCode}
                                        required
                                    >
                                        <option value="">
                                            {!regulationCode || !departmentCode
                                                ? "Select Regulation and Department First"
                                                : filteredPrograms.length === 0
                                                ? `No ${selectedRegulation?.level || "UG"} programmes found under this department`
                                                : "Select Programme"}
                                        </option>
                                        {filteredPrograms.map((p) => {
                                            const formattedTitle = p.specialization
                                                ? `${p.name} (${p.specialization})`
                                                : p.name;
                                            return (
                                                <option key={p.code} value={p.code}>
                                                    {formattedTitle} ({p.totalSemesters} Semesters)
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* TARGET SUMMARY BANNER */}
                            {selectedProgram && (
                                <div className="alert alert-light border mt-4">
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                        <div>
                                            <span className="badge bg-primary me-2">{selectedProgram.level}</span>
                                            <strong>{selectedProgram.name}</strong>
                                            {selectedProgram.specialization && (
                                                <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle ms-2">
                                                    Specialization: {selectedProgram.specialization}
                                                </span>
                                            )}
                                            <span className="text-muted ms-3">
                                                Duration: <strong>{selectedProgram.totalSemesters} Semesters</strong>
                                            </span>
                                        </div>
                                        <small className="text-muted">
                                            {selectedRegulation?.code} | {departmentCode}
                                        </small>
                                    </div>
                                </div>
                            )}

                            {/* FILE UPLOAD */}
                            <div className="mt-4">
                                <label className="form-label fw-semibold">
                                    Course Structure Excel File <span className="text-danger">*</span>
                                </label>
                                <input
                                    id="courseStructureFile"
                                    type="file"
                                    className="form-control form-control-lg"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    required
                                />
                            </div>

                            <div className="d-flex justify-content-end mt-4">
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg px-4"
                                    disabled={uploading || !selectedProgram}
                                >
                                    {uploading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
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
        </AdminLayout>
    );
}

export default CourseStructure;