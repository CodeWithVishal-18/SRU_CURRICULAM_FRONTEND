import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import AdminLayout from "../../layouts/AdminLayout";
import {
    getAllDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} from "../../services/departmentService";
import {
    getAllPrograms,
    createProgram,
    deleteProgram,
} from "../../services/programService";

function Departments() {
    const [departments, setDepartments] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [formData, setFormData] = useState({ name: "", code: "" });

    // Program Sub-management Modal State
    const [programModalDept, setProgramModalDept] = useState(null);
    const [newProgram, setNewProgram] = useState({
        name: "",
        specialization: "",
        code: "",
        level: "UG",
        totalSemesters: 8,
    });
    const [savingProgram, setSavingProgram] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [deptRes, progRes] = await Promise.all([
                getAllDepartments(),
                getAllPrograms().catch(() => ({ data: [] })),
            ]);
            setDepartments(deptRes?.data || []);
            setAllPrograms(progRes?.data || []);
        } catch (error) {
            toast.error("Failed to load departments or programs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAdd = () => {
        setEditingDepartment(null);
        setFormData({ name: "", code: "" });
        setShowModal(true);
    };

    const handleEdit = (dept) => {
        setEditingDepartment(dept);
        setFormData({ name: dept.name || "", code: dept.code || "" });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            toast.error("All fields are required");
            return;
        }
        try {
            setSaving(true);
            const payload = {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
            };
            if (editingDepartment) {
                await updateDepartment(editingDepartment.code, payload);
                toast.success("Department updated successfully");
            } else {
                await createDepartment(payload);
                toast.success("Department created successfully");
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save department");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (dept) => {
        if (!window.confirm(`Are you sure you want to delete ${dept.name}?`)) return;
        try {
            await deleteDepartment(dept.code);
            toast.success("Department deleted successfully");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete department");
        }
    };

    const handleOpenPrograms = (dept) => {
        setProgramModalDept(dept);
        setNewProgram({
            name: "",
            specialization: "",
            code: `${dept.code}_`,
            level: "UG",
            totalSemesters: 8,
        });
    };

    const handleCreateProgram = async (e) => {
        e.preventDefault();
        if (!newProgram.name.trim() || !newProgram.code.trim()) {
            toast.error("Programme title and code are required");
            return;
        }

        try {
            setSavingProgram(true);
            const payload = {
                name: newProgram.name.trim(),
                specialization: newProgram.specialization?.trim() || null,
                code: newProgram.code.trim().toUpperCase(),
                level: newProgram.level,
                departmentCode: programModalDept.code,
                totalSemesters: Number(newProgram.totalSemesters),
            };

            await createProgram(payload);
            toast.success("Programme added successfully");

            // Reset form
            setNewProgram({
                name: "",
                specialization: "",
                code: `${programModalDept.code}_`,
                level: "UG",
                totalSemesters: 8,
            });

            // Re-fetch programs list
            const progRes = await getAllPrograms();
            setAllPrograms(progRes?.data || []);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to add programme");
        } finally {
            setSavingProgram(false);
        }
    };

    const handleDeleteProgram = async (code) => {
        if (!window.confirm(`Delete programme ${code}?`)) return;
        try {
            await deleteProgram(code);
            toast.success("Programme deleted successfully");
            const progRes = await getAllPrograms();
            setAllPrograms(progRes?.data || []);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete programme");
        }
    };

    return (
        <AdminLayout>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">Departments</h2>
                    <p className="text-muted mb-0">
                        Manage university departments and their degree programmes.
                    </p>
                </div>
                <button className="btn btn-primary mt-3 mt-md-0" onClick={handleAdd}>
                    <i className="bi bi-plus-lg me-2"></i> Add Department
                </button>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                            <p className="text-muted mt-3 mb-0">Loading departments...</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="px-4">#</th>
                                        <th>Department Name</th>
                                        <th>Code</th>
                                        <th>Programmes</th>
                                        <th className="text-end px-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.map((dept, index) => {
                                        const deptProgs = allPrograms.filter(
                                            (p) => (p.departmentCode || "").toUpperCase() === dept.code.toUpperCase()
                                        );
                                        return (
                                            <tr key={dept.id}>
                                                <td className="px-4">{index + 1}</td>
                                                <td><div className="fw-semibold">{dept.name}</div></td>
                                                <td><span className="badge bg-light text-dark border">{dept.code}</span></td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => handleOpenPrograms(dept)}
                                                    >
                                                        <i className="bi bi-mortarboard me-1"></i>
                                                        Manage Programmes
                                                        <span className="badge bg-primary text-white ms-2">
                                                            {deptProgs.length}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="text-end px-4">
                                                    <button className="btn btn-sm btn-light me-2" onClick={() => handleEdit(dept)}>
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(dept)}>
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD/EDIT DEPT MODAL */}
            {showModal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <h5 className="modal-title fw-bold">
                                    {editingDepartment ? "Edit Department" : "Add Department"}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Department Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="form-control"
                                            placeholder="Computer Science & Engineering"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Department Code</label>
                                        <input
                                            type="text"
                                            name="code"
                                            className="form-control"
                                            placeholder="CSE"
                                            value={formData.code}
                                            onChange={handleChange}
                                            disabled={Boolean(editingDepartment)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? "Saving..." : editingDepartment ? "Update" : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MANAGE PROGRAMMES FOR DEPARTMENT MODAL */}
            {programModalDept && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <div>
                                    <h5 className="modal-title fw-bold mb-0">Degree Programmes</h5>
                                    <small className="text-muted">
                                        Department: {programModalDept.name} ({programModalDept.code})
                                    </small>
                                </div>
                                <button type="button" className="btn-close" onClick={() => setProgramModalDept(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                {/* ADD NEW PROGRAM FORM WITH SPECIALIZATION */}
                                <form onSubmit={handleCreateProgram} className="border p-3 rounded-3 bg-light mb-4">
                                    <h6 className="fw-bold mb-3">Add New Degree Programme</h6>
                                    <div className="row g-2 align-items-end">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label small fw-semibold text-muted mb-1">Programme Title *</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. B.Tech - Computer Science"
                                                value={newProgram.name}
                                                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <label className="form-label small fw-semibold text-muted mb-1">Specialization (Optional)</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. Artificial Intelligence"
                                                value={newProgram.specialization}
                                                onChange={(e) => setNewProgram({ ...newProgram, specialization: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6 col-md-2">
                                            <label className="form-label small fw-semibold text-muted mb-1">Code *</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. CSAI_BTECH"
                                                value={newProgram.code}
                                                onChange={(e) => setNewProgram({ ...newProgram, code: e.target.value.toUpperCase() })}
                                                required
                                            />
                                        </div>
                                        <div className="col-3 col-md-1">
                                            <label className="form-label small fw-semibold text-muted mb-1">Level *</label>
                                            <select
                                                className="form-select form-select-sm"
                                                value={newProgram.level}
                                                onChange={(e) => setNewProgram({ ...newProgram, level: e.target.value })}
                                            >
                                                <option value="UG">UG</option>
                                                <option value="PG">PG</option>
                                                <option value="PHD">PhD</option>
                                            </select>
                                        </div>
                                        <div className="col-3 col-md-1">
                                            <label className="form-label small fw-semibold text-muted mb-1">Semesters *</label>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                min="1"
                                                max="12"
                                                value={newProgram.totalSemesters}
                                                onChange={(e) => setNewProgram({ ...newProgram, totalSemesters: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-1">
                                            <button type="submit" className="btn btn-sm btn-primary w-100" disabled={savingProgram}>
                                                {savingProgram ? "..." : "+ Add"}
                                            </button>
                                        </div>
                                    </div>
                                </form>

                                {/* LIST OF PROGRAMMES UNDER THIS DEPT */}
                                <h6 className="fw-bold mb-2">Registered Programmes</h6>
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>#</th>
                                                <th>Programme Name</th>
                                                <th>Specialization</th>
                                                <th>Code</th>
                                                <th>Level</th>
                                                <th>Semesters</th>
                                                <th className="text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allPrograms
                                                .filter((p) => (p.departmentCode || "").toUpperCase() === programModalDept.code.toUpperCase())
                                                .map((p, idx) => (
                                                    <tr key={p.id || p.code}>
                                                        <td>{idx + 1}</td>
                                                        <td className="fw-semibold">{p.name}</td>
                                                        <td>
                                                            {p.specialization ? (
                                                                <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
                                                                    {p.specialization}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted small">None</span>
                                                            )}
                                                        </td>
                                                        <td><code>{p.code}</code></td>
                                                        <td>
                                                            <span className="badge bg-primary-subtle text-primary">
                                                                {p.level}
                                                            </span>
                                                        </td>
                                                        <td><strong>{p.totalSemesters} Semesters</strong></td>
                                                        <td className="text-end">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-light text-danger py-0"
                                                                onClick={() => handleDeleteProgram(p.code)}
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default Departments;