import { useEffect, useState } from "react";

import { toast } from "react-toastify";

import AdminLayout from "../../layouts/AdminLayout";

import {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
} from "../../services/userService";

import {
    getAllDepartments
} from "../../services/departmentService";


function Employees() {

    // =====================================================
    // STATE
    // =====================================================

    const [users, setUsers] = useState([]);

    const [departments, setDepartments] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [showModal, setShowModal] =
        useState(false);

    const [editingUser, setEditingUser] =
        useState(null);

    const [search, setSearch] =
        useState("");

    const [roleFilter, setRoleFilter] =
        useState("ALL");

    const [departmentFilter, setDepartmentFilter] =
        useState("ALL");

    const [formData, setFormData] =
        useState({
            employeeId: "",
            name: "",
            password: "",
            role: "HOD",
            departmentCode: ""
        });


    // =====================================================
    // FETCH USERS
    // =====================================================

    const fetchUsers = async () => {

        try {

            setLoading(true);

            const response =
                await getAllUsers();

            setUsers(
                response.data || []
            );

        } catch (error) {

            console.error(
                "Failed to fetch users:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to load HOD / DEAN"
            );

        } finally {

            setLoading(false);
        }
    };


    // =====================================================
    // FETCH DEPARTMENTS
    // =====================================================

    const fetchDepartments = async () => {

        try {

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
                "Failed to load departments"
            );
        }
    };


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {

        fetchUsers();
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

        setEditingUser(null);

        setFormData({
            employeeId: "",
            name: "",
            password: "",
            role: "HOD",
            departmentCode:
                departments.length > 0
                    ? departments[0].code
                    : ""
        });

        setShowModal(true);
    };


    // =====================================================
    // OPEN EDIT MODAL
    // =====================================================

    const handleEdit = (user) => {

        setEditingUser(user);

        setFormData({
            employeeId:
                user.employeeId || "",

            name:
                user.name || "",

            password: "",

            role:
                user.role || "HOD",

            departmentCode:
                user.departmentCode || ""
        });

        setShowModal(true);
    };


    // =====================================================
    // SUBMIT
    // =====================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        // -----------------------------------------------
        // VALIDATION
        // -----------------------------------------------

        if (!formData.name.trim()) {

            toast.error(
                "Name is required"
            );

            return;
        }

        if (!editingUser &&
            !formData.employeeId.trim()) {

            toast.error(
                "Employee ID is required"
            );

            return;
        }

        if (!editingUser &&
            !formData.password.trim()) {

            toast.error(
                "Password is required"
            );

            return;
        }

        if (
            !editingUser &&
            formData.password.length < 6
        ) {

            toast.error(
                "Password must be at least 6 characters"
            );

            return;
        }

        if (!formData.departmentCode) {

            toast.error(
                "Department is required"
            );

            return;
        }

        try {

            setSaving(true);

            // -----------------------------------------------
            // CREATE
            // -----------------------------------------------

            if (!editingUser) {

                const payload = {

                    employeeId:
                        formData.employeeId
                            .trim(),

                    name:
                        formData.name
                            .trim(),

                    password:
                        formData.password,

                    role:
                        formData.role,

                    departmentCode:
                        formData.departmentCode
                };

                await createUser(payload);

                toast.success(
                    "User created successfully"
                );

            }

            // -----------------------------------------------
            // UPDATE
            // -----------------------------------------------

            else {

                const payload = {

                    name:
                        formData.name
                            .trim(),

                    role:
                        formData.role,

                    departmentCode:
                        formData.departmentCode,

                    password:
                        formData.password
                            .trim()
                };

                await updateUser(
                    editingUser.employeeId,
                    payload
                );

                toast.success(
                    "User updated successfully"
                );
            }

            setShowModal(false);

            await fetchUsers();

        } catch (error) {

            console.error(
                "Failed to save user:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to save user"
            );

        } finally {

            setSaving(false);
        }
    };


    // =====================================================
    // DELETE
    // =====================================================

    const handleDelete = async (user) => {

        const confirmed =
            window.confirm(
                `Are you sure you want to delete ${user.name}?`
            );

        if (!confirmed) {
            return;
        }

        try {

            await deleteUser(
                user.employeeId
            );

            toast.success(
                "User deleted successfully"
            );

            await fetchUsers();

        } catch (error) {

            console.error(
                "Failed to delete user:",
                error
            );

            toast.error(
                error.response
                    ?.data
                    ?.message ||
                "Failed to delete user"
            );
        }
    };


    // =====================================================
    // FILTER USERS
    // =====================================================

    const filteredUsers =
        users.filter((user) => {

            const searchText =
                search
                    .toLowerCase()
                    .trim();

            const matchesSearch =
                !searchText ||
                user.employeeId
                    ?.toLowerCase()
                    .includes(searchText) ||
                user.name
                    ?.toLowerCase()
                    .includes(searchText);

            const matchesRole =
                roleFilter === "ALL" ||
                user.role === roleFilter;

            const matchesDepartment =
                departmentFilter === "ALL" ||
                user.departmentCode ===
                    departmentFilter;

            return (
                matchesSearch &&
                matchesRole &&
                matchesDepartment
            );
        });


    return (
        <AdminLayout>

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center mb-4">

                <div>

                    <h2 className="fw-bold mb-1">
                        HOD / DEAN
                    </h2>

                    <p className="text-muted mb-0">
                        Manage Heads of Department
                        and Deans.
                    </p>

                </div>

                <button
                    className="btn btn-primary mt-3 mt-xl-0"
                    onClick={handleAdd}
                >
                    <i className="bi bi-person-plus me-2"></i>

                    Add HOD / DEAN
                </button>

            </div>


            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <div className="row g-3">

                        {/* SEARCH */}

                        <div className="col-12 col-lg-6">

                            <label className="form-label small fw-semibold">
                                Search
                            </label>

                            <div className="input-group">

                                <span className="input-group-text bg-white">

                                    <i className="bi bi-search"></i>

                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by employee ID or name"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>


                        {/* ROLE */}

                        <div className="col-12 col-md-6 col-lg-3">

                            <label className="form-label small fw-semibold">
                                Role
                            </label>

                            <select
                                className="form-select"
                                value={roleFilter}
                                onChange={(event) =>
                                    setRoleFilter(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="ALL">
                                    All Roles
                                </option>

                                <option value="HOD">
                                    HOD
                                </option>

                                <option value="DEAN">
                                    DEAN
                                </option>

                            </select>

                        </div>


                        {/* DEPARTMENT */}

                        <div className="col-12 col-md-6 col-lg-3">

                            <label className="form-label small fw-semibold">
                                Department
                            </label>

                            <select
                                className="form-select"
                                value={
                                    departmentFilter
                                }
                                onChange={(event) =>
                                    setDepartmentFilter(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="ALL">
                                    All Departments
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
                                                department.code
                                            }
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                    </div>

                </div>

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
                            ></div>

                            <p className="text-muted mt-3 mb-0">
                                Loading users...
                            </p>

                        </div>

                    ) : filteredUsers.length === 0 ? (

                        <div className="text-center py-5">

                            <i
                                className="bi bi-people text-muted"
                                style={{
                                    fontSize: "45px"
                                }}
                            ></i>

                            <h5 className="mt-3">
                                No users found
                            </h5>

                            <p className="text-muted">
                                Try changing your search
                                or filters.
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
                                            Employee
                                        </th>

                                        <th>
                                            Role
                                        </th>

                                        <th>
                                            Department
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

                                    {filteredUsers.map(
                                        (user, index) => (

                                            <tr
                                                key={
                                                    user.employeeId
                                                }
                                            >

                                                <td className="px-4">
                                                    {index + 1}
                                                </td>


                                                {/* EMPLOYEE */}

                                                <td>

                                                    <div className="d-flex align-items-center">

                                                        <div
                                                            className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3 fw-semibold"
                                                            style={{
                                                                width: "42px",
                                                                height: "42px"
                                                            }}
                                                        >

                                                            {user.name
                                                                ?.charAt(0)
                                                                ?.toUpperCase()
                                                            }

                                                        </div>

                                                        <div>

                                                            <div className="fw-semibold">
                                                                {
                                                                    user.name
                                                                }
                                                            </div>

                                                            <small className="text-muted">
                                                                {
                                                                    user.employeeId
                                                                }
                                                            </small>

                                                        </div>

                                                    </div>

                                                </td>


                                                {/* ROLE */}

                                                <td>

                                                    {user.role === "HOD" ? (

                                                        <span className="badge bg-primary-subtle text-primary">
                                                            <i className="bi bi-person-badge me-1"></i>
                                                            HOD
                                                        </span>

                                                    ) : (

                                                        <span className="badge bg-success-subtle text-success">
                                                            <i className="bi bi-person-check me-1"></i>
                                                            DEAN
                                                        </span>

                                                    )}

                                                </td>


                                                {/* DEPARTMENT */}

                                                <td>

                                                    <div className="fw-semibold">
                                                        {
                                                            user.departmentCode
                                                        }
                                                    </div>

                                                    <small className="text-muted">
                                                        {
                                                            user.departmentName
                                                        }
                                                    </small>

                                                </td>


                                                {/* CREATED */}

                                                <td>

                                                    {user.createdAt
                                                        ? new Date(
                                                            user.createdAt
                                                        ).toLocaleDateString()
                                                        : "—"
                                                    }

                                                </td>


                                                {/* ACTIONS */}

                                                <td className="text-end px-4">

                                                    <button
                                                        className="btn btn-sm btn-light me-2"
                                                        title="Edit"
                                                        onClick={() =>
                                                            handleEdit(
                                                                user
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
                                                                user
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

                            {/* HEADER */}

                            <div className="modal-header">

                                <h5 className="modal-title fw-bold">

                                    {editingUser
                                        ? "Edit HOD / DEAN"
                                        : "Add HOD / DEAN"
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


                            {/* FORM */}

                            <form
                                onSubmit={
                                    handleSubmit
                                }
                            >

                                <div className="modal-body">

                                    {/* EMPLOYEE ID */}

                                    {!editingUser && (

                                        <div className="mb-3">

                                            <label className="form-label fw-semibold">
                                                Employee ID
                                            </label>

                                            <input
                                                type="text"
                                                name="employeeId"
                                                className="form-control"
                                                placeholder="Example: HOD001"
                                                value={
                                                    formData.employeeId
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                            />

                                        </div>

                                    )}


                                    {/* NAME */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Name
                                        </label>

                                        <input
                                            type="text"
                                            name="name"
                                            className="form-control"
                                            placeholder="Enter full name"
                                            value={
                                                formData.name
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                    </div>


                                    {/* PASSWORD */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">

                                            Password

                                            {editingUser && (
                                                <span className="text-muted fw-normal">
                                                    {" "}
                                                    (optional)
                                                </span>
                                            )}

                                        </label>

                                        <input
                                            type="password"
                                            name="password"
                                            className="form-control"
                                            placeholder={
                                                editingUser
                                                    ? "Leave blank to keep current password"
                                                    : "Minimum 6 characters"
                                            }
                                            value={
                                                formData.password
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                    </div>


                                    {/* ROLE */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Role
                                        </label>

                                        <select
                                            name="role"
                                            className="form-select"
                                            value={
                                                formData.role
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        >

                                            <option value="HOD">
                                                HOD
                                            </option>

                                            <option value="DEAN">
                                                DEAN
                                            </option>

                                        </select>

                                    </div>


                                    {/* DEPARTMENT */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Department
                                        </label>

                                        <select
                                            name="departmentCode"
                                            className="form-select"
                                            value={
                                                formData.departmentCode
                                            }
                                            onChange={
                                                handleChange
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


                                {/* FOOTER */}

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

                                                {editingUser
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

export default Employees;