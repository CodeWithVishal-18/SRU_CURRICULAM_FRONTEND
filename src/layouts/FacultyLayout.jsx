import {
    useState
} from "react";

import {
    NavLink,
    useNavigate
} from "react-router-dom";

import {
    useAuth
} from "../context/AuthContext";


function FacultyLayout({ children }) {

    const {
        user,
        logout
    } = useAuth();

    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] =
        useState(false);


    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {

        logout();

        navigate("/login");
    };


    // =====================================================
    // NAVIGATION
    // =====================================================

    const navigation = [

        {
            name: "Dashboard",
            path: "/faculty/dashboard",
            icon: "bi-speedometer2"
        },

        {
            name: "Curriculum",
            path: "/faculty/curriculum",
            icon: "bi-mortarboard"
        }

    ];


    return (
        <div className="min-vh-100 bg-light">

            {/* =================================================
                MOBILE NAVBAR
            ================================================= */}

            <nav
                className="navbar bg-white border-bottom d-lg-none"
            >

                <div className="container-fluid">

                    <button
                        className="btn btn-light"
                        onClick={() =>
                            setSidebarOpen(
                                !sidebarOpen
                            )
                        }
                    >
                        <i className="bi bi-list fs-4"></i>
                    </button>


                    <span className="fw-bold">
                        SRU Curriculum
                    </span>


                    <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                        style={{
                            width: "38px",
                            height: "38px"
                        }}
                    >
                        {user?.name
                            ?.charAt(0)
                            ?.toUpperCase()}
                    </div>

                </div>

            </nav>


            {/* =================================================
                SIDEBAR
            ================================================= */}

            <aside
                className={`position-fixed top-0 start-0 bg-white border-end ${sidebarOpen
                        ? "d-block"
                        : "d-none"
                    } d-lg-flex flex-column`}
                style={{
                    width: "260px",
                    height: "100vh",
                    zIndex: 1050
                }}
            >

                {/* =============================================
                    BRAND
                ============================================= */}

                <div className="p-4 border-bottom">

                    <div className="d-flex align-items-center">

                        <div
                            className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center me-3"
                            style={{
                                width: "42px",
                                height: "42px"
                            }}
                        >
                            <i className="bi bi-mortarboard-fill"></i>
                        </div>

                        <div>

                            <div className="fw-bold">
                                SRU Curriculum
                            </div>

                            <small className="text-muted">
                                Faculty Portal
                            </small>

                        </div>

                    </div>

                </div>


                {/* =============================================
                    USER
                ============================================= */}

                <div className="p-3 border-bottom">

                    <div className="d-flex align-items-center">

                        <div
                            className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{
                                width: "42px",
                                height: "42px"
                            }}
                        >
                            <i className="bi bi-person"></i>
                        </div>

                        <div className="overflow-hidden">

                            <div className="fw-semibold text-truncate">
                                {user?.name}
                            </div>

                            <small className="text-muted">
                                {user?.role}
                            </small>

                        </div>

                    </div>


                    <div className="mt-3">

                        <span className="badge bg-primary-subtle text-primary">

                            <i className="bi bi-building me-1"></i>

                            {user?.departmentCode}

                        </span>

                    </div>

                </div>


                {/* =============================================
                    MENU
                ============================================= */}

                <div className="p-3 flex-grow-1">

                    <small className="text-uppercase text-muted fw-semibold px-2">
                        Menu
                    </small>


                    <div className="mt-2">

                        {navigation.map(
                            (item) => (

                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() =>
                                        setSidebarOpen(
                                            false
                                        )
                                    }
                                    className={({ isActive }) =>
                                        `d-flex align-items-center text-decoration-none rounded-3 px-3 py-3 mb-1 ${isActive
                                            ? "bg-primary text-white"
                                            : "text-dark"
                                        }`
                                    }
                                >

                                    <i
                                        className={`bi ${item.icon} me-3`}
                                    ></i>

                                    <span>
                                        {item.name}
                                    </span>

                                </NavLink>

                            )
                        )}

                    </div>

                </div>


                {/* =============================================
                    LOGOUT
                ============================================= */}

                <div className="p-3 border-top">

                    <button
                        className="btn btn-light border w-100 text-start"
                        onClick={
                            handleLogout
                        }
                    >

                        <i className="bi bi-box-arrow-right me-2 text-danger"></i>

                        Logout

                    </button>

                </div>

            </aside>


            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <main className="p-3 p-lg-4 faculty-main">
                {children}
            </main>

        </div>
    );
}

export default FacultyLayout;