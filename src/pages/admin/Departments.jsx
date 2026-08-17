import { useEffect, useState } from "react";

import { toast } from "react-toastify";

import AdminLayout from "../../layouts/AdminLayout";

import {
    getAllDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from "../../services/departmentService";

function Departments() {

    const [departments, setDepartments] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [showModal, setShowModal] =
        useState(false);

    const [editingDepartment, setEditingDepartment] =
        useState(null);

    const [formData, setFormData] =
        useState({
            name: "",
            code: ""
        });

    // =====================================================
    // FETCH DEPARTMENTS
    // =====================================================

    const fetchDepartments = async () => {

        try {

            setLoading(true);

            const response =
                await getAllDepartments();

            setDepartments(
                response.data || []
            );

        } catch (error) {

            console.error(
                "Failed to fetch departments:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message
                    ||
                "Failed to load departments"
            );

        } finally {

            setLoading(false);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {

        fetchDepartments();

    }, []);

    // =====================================================
    // INPUT CHANGE
    // =====================================================

    const handleChange = (event) => {

        const {
            name,
            value
        } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    // =====================================================
    // OPEN ADD MODAL
    // =====================================================

    const handleAdd = () => {

        setEditingDepartment(null);

        setFormData({
            name: "",
            code: ""
        });

        setShowModal(true);
    };

    // =====================================================
    // OPEN EDIT MODAL
    // =====================================================

    const handleEdit = (department) => {

        setEditingDepartment(
            department
        );

        setFormData({
            name: department.name || "",
            code: department.code || ""
        });

        setShowModal(true);
    };

    // =====================================================
    // SUBMIT
    // =====================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        if (!formData.name.trim()) {

            toast.error(
                "Department name is required"
            );

            return;
        }

        if (!formData.code.trim()) {

            toast.error(
                "Department code is required"
            );

            return;
        }

        try {

            setSaving(true);

            const payload = {
                name:
                    formData.name.trim(),

                code:
                    formData.code
                        .trim()
                        .toUpperCase()
            };

            if (editingDepartment) {

                await updateDepartment(
                    editingDepartment.code,
                    payload
                );

                toast.success(
                    "Department updated successfully"
                );

            } else {

                await createDepartment(
                    payload
                );

                toast.success(
                    "Department created successfully"
                );
            }

            setShowModal(false);

            await fetchDepartments();

        } catch (error) {

            console.error(
                "Failed to save department:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message
                    ||
                "Failed to save department"
            );

        } finally {

            setSaving(false);
        }
    };

    // =====================================================
    // DELETE
    // =====================================================

    const handleDelete = async (department) => {

        const confirmed =
            window.confirm(
                `Are you sure you want to delete ${department.name}?`
            );

        if (!confirmed) {
            return;
        }

        try {

            await deleteDepartment(
                department.code
            );

            toast.success(
                "Department deleted successfully"
            );

            await fetchDepartments();

        } catch (error) {

            console.error(
                "Failed to delete department:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message
                    ||
                "Failed to delete department"
            );
        }
    };

    return (
        <AdminLayout>

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">

                <div>

                    <h2 className="fw-bold mb-1">
                        Departments
                    </h2>

                    <p className="text-muted mb-0">
                        Manage university departments
                        used in the curriculum system.
                    </p>

                </div>

                <button
                    className="btn btn-primary mt-3 mt-md-0"
                    onClick={handleAdd}
                >
                    <i className="bi bi-plus-lg me-2"></i>
                    Add Department
                </button>

            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            <div className="card border-0 shadow-sm">

                <div className="card-body p-0">

                    {loading ? (

                        <div className="text-center py-5">

                            <div
                                className="spinner-border text-primary"
                                role="status"
                            ></div>

                            <p className="text-muted mt-3 mb-0">
                                Loading departments...
                            </p>

                        </div>

                    ) : departments.length === 0 ? (

                        <div className="text-center py-5">

                            <i
                                className="bi bi-building-x text-muted"
                                style={{
                                    fontSize: "45px"
                                }}
                            ></i>

                            <h5 className="mt-3">
                                No departments found
                            </h5>

                            <p className="text-muted">
                                Create your first department.
                            </p>

                        </div>

                    ) : (

                        <div className="table-responsive">

                            <table className="table table-hover align-middle mb-0">

                                <thead className="table-light">

                                    <tr>

                                        <th className="px-4">
                                            #
                                        </th>

                                        <th>
                                            Department Name
                                        </th>

                                        <th>
                                            Code
                                        </th>

                                        <th>
                                            Created
                                        </th>

                                        <th className="text-end px-4">
                                            Actions
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {departments.map(
                                        (department, index) => (

                                            <tr
                                                key={
                                                    department.id
                                                }
                                            >

                                                <td className="px-4">
                                                    {index + 1}
                                                </td>

                                                <td>

                                                    <div className="d-flex align-items-center">

                                                        <div
                                                            className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center me-3"
                                                            style={{
                                                                width: "40px",
                                                                height: "40px"
                                                            }}
                                                        >

                                                            <i className="bi bi-building"></i>

                                                        </div>

                                                        <div>

                                                            <div className="fw-semibold">
                                                                {
                                                                    department.name
                                                                }
                                                            </div>

                                                        </div>

                                                    </div>

                                                </td>

                                                <td>

                                                    <span className="badge bg-light text-dark border">
                                                        {
                                                            department.code
                                                        }
                                                    </span>

                                                </td>

                                                <td>
                                                    {
                                                        department.createdAt
                                                            ? new Date(
                                                                department.createdAt
                                                            ).toLocaleDateString()
                                                            : "—"
                                                    }
                                                </td>

                                                <td className="text-end px-4">

                                                    <button
                                                        className="btn btn-sm btn-light me-2"
                                                        title="Edit"
                                                        onClick={() =>
                                                            handleEdit(
                                                                department
                                                            )
                                                        }
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-light text-danger"
                                                        title="Delete"
                                                        onClick={() =>
                                                            handleDelete(
                                                                department
                                                            )
                                                        }
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>


            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            {showModal && (

                <div
                    className="modal d-block"
                    tabIndex="-1"
                    style={{
                        backgroundColor:
                            "rgba(0,0,0,0.5)"
                    }}
                >

                    <div className="modal-dialog modal-dialog-centered">

                        <div className="modal-content border-0 shadow">

                            <div className="modal-header">

                                <h5 className="modal-title fw-bold">

                                    {editingDepartment
                                        ? "Edit Department"
                                        : "Add Department"
                                    }

                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                ></button>

                            </div>

                            <form
                                onSubmit={
                                    handleSubmit
                                }
                            >

                                <div className="modal-body">

                                    {/* DEPARTMENT NAME */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Department Name
                                        </label>

                                        <input
                                            type="text"
                                            name="name"
                                            className="form-control"
                                            placeholder="Computer Science & Engineering"
                                            value={
                                                formData.name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                    </div>


                                    {/* DEPARTMENT CODE */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Department Code
                                        </label>

                                        <input
                                            type="text"
                                            name="code"
                                            className="form-control"
                                            placeholder="CSE"
                                            value={
                                                formData.code
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                Boolean(
                                                    editingDepartment
                                                )
                                            }
                                        />

                                        <small className="text-muted">
                                            Example: CSE, ECE, ME
                                        </small>

                                    </div>

                                </div>


                                <div className="modal-footer">

                                    <button
                                        type="button"
                                        className="btn btn-light"
                                        onClick={() =>
                                            setShowModal(false)
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={saving}
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

                                                {editingDepartment
                                                    ? "Update"
                                                    : "Create"
                                                }
                                            </>
                                        )}

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>

            )}

        </AdminLayout>
    );
}

export default Departments;