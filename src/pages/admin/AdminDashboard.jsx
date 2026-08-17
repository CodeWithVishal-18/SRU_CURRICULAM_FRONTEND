import { useEffect, useState } from "react";
import {
    useNavigate
} from "react-router-dom";

import AdminLayout
    from "../../layouts/AdminLayout";

import {
    useAuth
} from "../../context/AuthContext";
import { getAllRegulations } from "../../services/regulationService";
import { getAllDepartments } from "../../services/departmentService";
import { getAllUsers } from "../../services/userService";

function AdminDashboard() {

    const { user } = useAuth();

    const navigate = useNavigate();

    const [statisticsData, setStatisticsData] =
        useState({
            regulations: 0,
            departments: 0,
            users: 0
        });

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {

        const loadStatistics = async () => {

            try {

                setLoading(true);

                const [
                    regulationResponse,
                    departmentResponse,
                    userResponse
                ] = await Promise.all([
                    getAllRegulations(),
                    getAllDepartments(),
                    getAllUsers()
                ]);

                const regulations =
                    regulationResponse.data || [];

                const departments =
                    departmentResponse.data || [];

                const users =
                    userResponse.data || [];


                setStatisticsData({
                    regulations:
                        regulations.length,

                    departments:
                        departments.length,

                    users:
                        users.length
                });

            } catch (error) {

                console.error(
                    "Failed to load dashboard statistics:",
                    error
                );

            } finally {

                setLoading(false);
            }
        };

        loadStatistics();

    }, []);


    const statistics = [
        {
            title: "Regulations",

            value: loading
                ? "..."
                : statisticsData.regulations,

            icon: "bi-journal-text",

            description:
                "Academic regulations",

            path: "/admin/regulations"
        },

        {
            title: "Departments",

            value: loading
                ? "..."
                : statisticsData.departments,

            icon: "bi-building",

            description:
                "University departments",

            path: "/admin/departments"
        },

        {
            title: "HOD / DEAN",

            value: loading
                ? "..."
                : statisticsData.users,

            icon: "bi-people",

            description:
                "Faculty administrators",

            path: "/admin/employees"
        },

        {
            title: "Course Structures",

            value: "—",

            icon:
                "bi-file-earmark-spreadsheet",

            description:
                "Uploaded curriculum",

            path:
                "/admin/course-structure"
        }
    ];

    return (
        <AdminLayout>

            {/* =========================================
                HEADER
            ========================================= */}

            <div className="mb-4">

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">

                    <div>

                        <h2 className="fw-bold mb-1">
                            Dashboard
                        </h2>

                        <p className="text-muted mb-0">
                            Welcome back,{" "}
                            <span className="fw-semibold text-dark">
                                {user?.name}
                            </span>
                            . Here's an overview of the
                            curriculum system.
                        </p>

                    </div>

                    <div className="mt-3 mt-md-0">

                        <span className="badge bg-primary-subtle text-primary px-3 py-2">
                            <i className="bi bi-shield-check me-1"></i>
                            Administrator
                        </span>

                    </div>

                </div>

            </div>


            {/* =========================================
                STATISTICS
            ========================================= */}

            <div className="row g-3 mb-4">

                {statistics.map((item) => (

                    <div
                        className="col-12 col-sm-6 col-xl-3"
                        key={item.title}
                    >

                        <div
                            className="card border-0 shadow-sm h-100"
                            style={{
                                cursor: "pointer"
                            }}
                            onClick={() =>
                                navigate(item.path)
                            }
                        >

                            <div className="card-body p-4">

                                <div className="d-flex justify-content-between align-items-start">

                                    <div>

                                        <p className="text-muted small mb-2">
                                            {item.title}
                                        </p>

                                        <h3 className="fw-bold mb-1">
                                            {item.value}
                                        </h3>

                                        <small className="text-muted">
                                            {item.description}
                                        </small>

                                    </div>

                                    <div
                                        className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
                                        style={{
                                            width: "48px",
                                            height: "48px"
                                        }}
                                    >

                                        <i
                                            className={`bi ${item.icon} fs-5`}
                                        ></i>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                ))}

            </div>


            {/* =========================================
                QUICK ACTIONS
            ========================================= */}

            <div className="row g-4">

                <div className="col-12 col-xl-8">

                    <div className="card border-0 shadow-sm">

                        <div className="card-body p-4">

                            <div className="d-flex justify-content-between align-items-center mb-4">

                                <div>

                                    <h5 className="fw-bold mb-1">
                                        Quick Actions
                                    </h5>

                                    <p className="text-muted small mb-0">
                                        Manage your curriculum system
                                    </p>

                                </div>

                                <i className="bi bi-lightning-charge text-primary fs-4"></i>

                            </div>

                            <div className="row g-3">

                                <div className="col-12 col-md-6">

                                    <button
                                        className="btn btn-light border w-100 text-start p-3"
                                        onClick={() =>
                                            navigate(
                                                "/admin/regulations"
                                            )
                                        }
                                    >

                                        <div className="d-flex align-items-center">

                                            <div
                                                className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center me-3"
                                                style={{
                                                    width: "45px",
                                                    height: "45px"
                                                }}
                                            >

                                                <i className="bi bi-journal-plus"></i>

                                            </div>

                                            <div>

                                                <div className="fw-semibold">
                                                    Manage Regulations
                                                </div>

                                                <small className="text-muted">
                                                    Add R26, R27 and more
                                                </small>

                                            </div>

                                        </div>

                                    </button>

                                </div>


                                <div className="col-12 col-md-6">

                                    <button
                                        className="btn btn-light border w-100 text-start p-3"
                                        onClick={() =>
                                            navigate(
                                                "/admin/course-structure"
                                            )
                                        }
                                    >

                                        <div className="d-flex align-items-center">

                                            <div
                                                className="bg-success-subtle text-success rounded-3 d-flex align-items-center justify-content-center me-3"
                                                style={{
                                                    width: "45px",
                                                    height: "45px"
                                                }}
                                            >

                                                <i className="bi bi-file-earmark-arrow-up"></i>

                                            </div>

                                            <div>

                                                <div className="fw-semibold">
                                                    Upload Course Structure
                                                </div>

                                                <small className="text-muted">
                                                    Upload Excel curriculum
                                                </small>

                                            </div>

                                        </div>

                                    </button>

                                </div>


                                <div className="col-12 col-md-6">

                                    <button
                                        className="btn btn-light border w-100 text-start p-3"
                                        onClick={() =>
                                            navigate(
                                                "/admin/departments"
                                            )
                                        }
                                    >

                                        <div className="d-flex align-items-center">

                                            <div
                                                className="bg-warning-subtle text-warning rounded-3 d-flex align-items-center justify-content-center me-3"
                                                style={{
                                                    width: "45px",
                                                    height: "45px"
                                                }}
                                            >

                                                <i className="bi bi-building-add"></i>

                                            </div>

                                            <div>

                                                <div className="fw-semibold">
                                                    Manage Departments
                                                </div>

                                                <small className="text-muted">
                                                    Add and update departments
                                                </small>

                                            </div>

                                        </div>

                                    </button>

                                </div>


                                <div className="col-12 col-md-6">

                                    <button
                                        className="btn btn-light border w-100 text-start p-3"
                                        onClick={() =>
                                            navigate(
                                                "/admin/employees"
                                            )
                                        }
                                    >

                                        <div className="d-flex align-items-center">

                                            <div
                                                className="bg-info-subtle text-info rounded-3 d-flex align-items-center justify-content-center me-3"
                                                style={{
                                                    width: "45px",
                                                    height: "45px"
                                                }}
                                            >

                                                <i className="bi bi-person-plus"></i>

                                            </div>

                                            <div>

                                                <div className="fw-semibold">
                                                    Manage HOD / DEAN
                                                </div>

                                                <small className="text-muted">
                                                    Manage faculty roles
                                                </small>

                                            </div>

                                        </div>

                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                {/* =====================================
                    SYSTEM INFORMATION
                ===================================== */}

                <div className="col-12 col-xl-4">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body p-4">

                            <div className="d-flex align-items-center mb-4">

                                <div
                                    className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center me-3"
                                    style={{
                                        width: "45px",
                                        height: "45px"
                                    }}
                                >

                                    <i className="bi bi-info-circle"></i>

                                </div>

                                <div>

                                    <h5 className="fw-bold mb-0">
                                        System Information
                                    </h5>

                                    <small className="text-muted">
                                        Current session
                                    </small>

                                </div>

                            </div>


                            <div className="mb-3">

                                <small className="text-muted">
                                    Logged in as
                                </small>

                                <div className="fw-semibold">
                                    {user?.name}
                                </div>

                            </div>


                            <div className="mb-3">

                                <small className="text-muted">
                                    Employee ID
                                </small>

                                <div className="fw-semibold">
                                    {user?.employeeId}
                                </div>

                            </div>


                            <div className="mb-3">

                                <small className="text-muted">
                                    Role
                                </small>

                                <div>

                                    <span className="badge bg-primary">
                                        {user?.role}
                                    </span>

                                </div>

                            </div>


                            <div>

                                <small className="text-muted">
                                    Access
                                </small>

                                <div className="text-success fw-semibold">

                                    <i className="bi bi-check-circle me-1"></i>

                                    Full Administrator Access

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </AdminLayout>
    );
}

export default AdminDashboard;