import { useEffect, useState } from "react";

import {
    toast
} from "react-toastify";

import AdminLayout
    from "../../layouts/AdminLayout";

import {
    getAllRegulations,
    createRegulation,
    updateRegulation,
    deleteRegulation
} from "../../services/regulationService";

function Regulations() {

    const [regulations, setRegulations] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [showModal, setShowModal] =
        useState(false);

    const [editingRegulation, setEditingRegulation] =
        useState(null);

    const [formData, setFormData] =
        useState({
            code: "",
            startYear: "",
            description: "",
            isActive: true
        });

    // =====================================================
    // FETCH REGULATIONS
    // =====================================================

    const fetchRegulations = async () => {

        try {

            setLoading(true);

            const response =
                await getAllRegulations();

            setRegulations(
                response.data || []
            );

        } catch (error) {

            console.error(
                "Failed to fetch regulations:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message
                    ||
                "Failed to load regulations"
            );

        } finally {

            setLoading(false);
        }
    };

    useEffect(() => {

        fetchRegulations();

    }, []);

    // =====================================================
    // INPUT CHANGE
    // =====================================================

    const handleChange = (event) => {

        const {
            name,
            value,
            type,
            checked
        } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };

    // =====================================================
    // OPEN ADD MODAL
    // =====================================================

    const handleAdd = () => {

        setEditingRegulation(null);

        setFormData({
            code: "",
            startYear: "",
            description: "",
            isActive: true
        });

        setShowModal(true);
    };

    // =====================================================
    // OPEN EDIT MODAL
    // =====================================================

    const handleEdit = (regulation) => {

        setEditingRegulation(
            regulation
        );

        setFormData({
            code: regulation.code || "",
            startYear:
                regulation.startYear || "",
            description:
                regulation.description || "",
            isActive:
                regulation.isActive ?? true
        });

        setShowModal(true);
    };

    // =====================================================
    // SAVE
    // =====================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        if (!formData.code.trim()) {

            toast.error(
                "Regulation code is required"
            );

            return;
        }

        if (!formData.startYear) {

            toast.error(
                "Start year is required"
            );

            return;
        }

        try {

            setSaving(true);

            const payload = {
                code:
                    formData.code
                        .trim()
                        .toUpperCase(),

                startYear:
                    Number(formData.startYear),

                description:
                    formData.description.trim(),

                isActive:
                    formData.isActive
            };

            if (editingRegulation) {

                await updateRegulation(
                    editingRegulation.code,
                    payload
                );

                toast.success(
                    "Regulation updated successfully"
                );

            } else {

                await createRegulation(
                    payload
                );

                toast.success(
                    "Regulation created successfully"
                );
            }

            setShowModal(false);

            await fetchRegulations();

        } catch (error) {

            console.error(
                "Failed to save regulation:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message
                    ||
                "Failed to save regulation"
            );

        } finally {

            setSaving(false);
        }
    };

    // =====================================================
    // DELETE
    // =====================================================

    const handleDelete = async (regulation) => {

        const confirmed =
            window.confirm(
                `Are you sure you want to delete ${regulation.code}?`
            );

        if (!confirmed) {
            return;
        }

        try {

            await deleteRegulation(
                regulation.code
            );

            toast.success(
                "Regulation deleted successfully"
            );

            await fetchRegulations();

        } catch (error) {

            console.error(
                "Failed to delete regulation:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message
                    ||
                "Failed to delete regulation"
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
                        Regulations
                    </h2>

                    <p className="text-muted mb-0">
                        Manage academic regulations
                        used by the curriculum system.
                    </p>

                </div>

                <button
                    className="btn btn-primary mt-3 mt-md-0"
                    onClick={handleAdd}
                >
                    <i className="bi bi-plus-lg me-2"></i>
                    Add Regulation
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
                                Loading regulations...
                            </p>

                        </div>

                    ) : regulations.length === 0 ? (

                        <div className="text-center py-5">

                            <i
                                className="bi bi-journal-x text-muted"
                                style={{
                                    fontSize: "45px"
                                }}
                            ></i>

                            <h5 className="mt-3">
                                No regulations found
                            </h5>

                            <p className="text-muted">
                                Create your first academic
                                regulation.
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
                                            Regulation
                                        </th>

                                        <th>
                                            Start Year
                                        </th>

                                        <th>
                                            Description
                                        </th>

                                        <th>
                                            Status
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

                                    {regulations.map(
                                        (regulation, index) => (

                                            <tr
                                                key={
                                                    regulation.id
                                                }
                                            >

                                                <td className="px-4">
                                                    {index + 1}
                                                </td>

                                                <td>

                                                    <span className="fw-semibold">
                                                        {
                                                            regulation.code
                                                        }
                                                    </span>

                                                </td>

                                                <td>
                                                    {
                                                        regulation.startYear
                                                    }
                                                </td>

                                                <td>

                                                    <span className="text-muted">

                                                        {
                                                            regulation.description
                                                                || "—"
                                                        }

                                                    </span>

                                                </td>

                                                <td>

                                                    {regulation.isActive ? (

                                                        <span className="badge bg-success-subtle text-success">
                                                            <i className="bi bi-check-circle me-1"></i>
                                                            Active
                                                        </span>

                                                    ) : (

                                                        <span className="badge bg-secondary-subtle text-secondary">
                                                            Inactive
                                                        </span>

                                                    )}

                                                </td>

                                                <td>
                                                    {regulation.createdAt
                                                        ? new Date(
                                                            regulation.createdAt
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
                                                                regulation
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
                                                                regulation
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

                                    {editingRegulation
                                        ? "Edit Regulation"
                                        : "Add Regulation"
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

                                    {/* CODE */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Regulation Code
                                        </label>

                                        <input
                                            type="text"
                                            name="code"
                                            className="form-control"
                                            placeholder="Example: R26"
                                            value={
                                                formData.code
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                Boolean(
                                                    editingRegulation
                                                )
                                            }
                                        />

                                        <small className="text-muted">
                                            Example: R25, R26, R27
                                        </small>

                                    </div>


                                    {/* START YEAR */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Start Year
                                        </label>

                                        <input
                                            type="number"
                                            name="startYear"
                                            className="form-control"
                                            placeholder="2026"
                                            value={
                                                formData.startYear
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                    </div>


                                    {/* DESCRIPTION */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Description
                                        </label>

                                        <textarea
                                            name="description"
                                            className="form-control"
                                            rows="3"
                                            placeholder="Enter regulation description"
                                            value={
                                                formData.description
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        ></textarea>

                                    </div>


                                    {/* ACTIVE */}

                                    <div className="form-check form-switch">

                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            name="isActive"
                                            checked={
                                                formData.isActive
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            id="regulationActive"
                                        />

                                        <label
                                            className="form-check-label"
                                            htmlFor="regulationActive"
                                        >
                                            Active Regulation
                                        </label>

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

                                                {editingRegulation
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

export default Regulations;