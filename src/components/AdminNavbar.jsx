import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

function AdminNavbar() {

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [showProfile, setShowProfile] = useState(false);

    const handleLogout = () => {

        logout();

        toast.success("Logged out successfully");

        navigate("/login");
    };

    return (
        <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm sticky-top">

            <div className="container-fluid px-3 px-lg-4">

                {/* =========================================
                    BRAND
                ========================================= */}

                <div className="d-flex align-items-center">

                    <button
                        className="btn btn-light d-lg-none me-2"
                        type="button"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#adminSidebar"
                    >
                        <i className="bi bi-list fs-4"></i>
                    </button>

                    <div
                        className="d-flex align-items-center"
                        style={{
                            cursor: "pointer"
                        }}
                        onClick={() =>
                            navigate("/admin")
                        }
                    >

                        <div
                            className="d-flex align-items-center justify-content-center bg-primary text-white rounded-3 me-2"
                            style={{
                                width: "42px",
                                height: "42px"
                            }}
                        >
                            <i className="bi bi-mortarboard-fill fs-5"></i>
                        </div>

                        <div className="d-none d-sm-block">

                            <div className="fw-bold text-dark">
                                SRU
                            </div>

                            <small className="text-muted">
                                Curriculum Portal
                            </small>

                        </div>

                    </div>

                </div>

                {/* =========================================
                    RIGHT SIDE
                ========================================= */}

                <div className="d-flex align-items-center ms-auto">

                    {/* Notification */}

                    <button
                        type="button"
                        className="btn btn-light rounded-circle me-2"
                        style={{
                            width: "42px",
                            height: "42px"
                        }}
                        title="Notifications"
                    >
                        <i className="bi bi-bell"></i>
                    </button>

                    {/* Divider */}

                    <div
                        className="vr mx-2 d-none d-sm-block"
                        style={{
                            height: "30px"
                        }}
                    ></div>

                    {/* Profile */}

                    <div className="position-relative">

                        <button
                            type="button"
                            className="btn d-flex align-items-center border-0"
                            onClick={() =>
                                setShowProfile(
                                    !showProfile
                                )
                            }
                        >

                            <div
                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2 fw-semibold"
                                style={{
                                    width: "40px",
                                    height: "40px"
                                }}
                            >
                                {user?.name
                                    ?.charAt(0)
                                    ?.toUpperCase()
                                    || "A"
                                }
                            </div>

                            <div className="text-start d-none d-md-block">

                                <div className="fw-semibold small">
                                    {user?.name || "Administrator"}
                                </div>

                                <div className="text-muted small">
                                    {user?.role || "ADMIN"}
                                </div>

                            </div>

                            <i className="bi bi-chevron-down ms-2 small"></i>

                        </button>

                        {/* PROFILE DROPDOWN */}

                        {showProfile && (

                            <div
                                className="position-absolute end-0 mt-2 bg-white border rounded-3 shadow"
                                style={{
                                    width: "240px",
                                    zIndex: 1050
                                }}
                            >

                                <div className="p-3 border-bottom">

                                    <div className="fw-semibold">
                                        {user?.name}
                                    </div>

                                    <small className="text-muted">
                                        {user?.employeeId}
                                    </small>

                                    <div className="mt-2">

                                        <span className="badge bg-primary">
                                            {user?.role}
                                        </span>

                                    </div>

                                </div>

                                <div className="p-2">

                                    <button
                                        className="btn btn-light w-100 text-start mb-1"
                                        onClick={() =>
                                            setShowProfile(false)
                                        }
                                    >
                                        <i className="bi bi-person me-2"></i>
                                        My Profile
                                    </button>

                                    <button
                                        className="btn btn-light w-100 text-start text-danger"
                                        onClick={handleLogout}
                                    >
                                        <i className="bi bi-box-arrow-right me-2"></i>
                                        Logout
                                    </button>

                                </div>

                            </div>
                        )}

                    </div>

                </div>

            </div>

        </nav>
    );
}

export default AdminNavbar;