import {
    useNavigate
} from "react-router-dom";

import {
    useAuth
} from "../../context/AuthContext";

import FacultyLayout
    from "../../layouts/FacultyLayout";


function FacultyDashboard() {

    const {
        user
    } = useAuth();

    const navigate =
        useNavigate();


    return (
        <FacultyLayout>

            {/* =================================================
                HEADER
            ================================================= */}

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

                            . Manage your department
                            curriculum here.

                        </p>

                    </div>


                    <div className="mt-3 mt-md-0">

                        <span className="badge bg-primary-subtle text-primary px-3 py-2">

                            <i className="bi bi-person-badge me-1"></i>

                            {user?.role}

                        </span>

                    </div>

                </div>

            </div>


            {/* =================================================
                DEPARTMENT CARD
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <div className="d-flex align-items-center">

                        <div
                            className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center me-3"
                            style={{
                                width: "55px",
                                height: "55px"
                            }}
                        >

                            <i className="bi bi-building fs-4"></i>

                        </div>


                        <div>

                            <small className="text-muted">
                                Your Department
                            </small>

                            <h5 className="fw-bold mb-0">

                                {user?.departmentName ||
                                    user?.departmentCode}

                            </h5>

                            <small className="text-muted">

                                {user?.departmentCode}

                            </small>

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                QUICK ACTION
            ================================================= */}

            <div className="row g-4">

                <div className="col-12 col-md-6">

                    <div
                        className="card border-0 shadow-sm h-100"
                        style={{
                            cursor: "pointer"
                        }}
                        onClick={() =>
                            navigate(
                                "/faculty/curriculum"
                            )
                        }
                    >

                        <div className="card-body p-4">

                            <div className="d-flex align-items-center">

                                <div
                                    className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center me-3"
                                    style={{
                                        width: "50px",
                                        height: "50px"
                                    }}
                                >

                                    <i className="bi bi-mortarboard fs-4"></i>

                                </div>


                                <div>

                                    <h5 className="fw-bold mb-1">
                                        Curriculum
                                    </h5>

                                    <p className="text-muted small mb-0">
                                        View semester courses
                                        and manage electives.
                                    </p>

                                </div>

                            </div>


                            <div className="mt-4 text-primary fw-semibold">

                                Open Curriculum

                                <i className="bi bi-arrow-right ms-2"></i>

                            </div>

                        </div>

                    </div>

                </div>


                {/* =============================================
                    ROLE INFORMATION
                ============================================= */}

                <div className="col-12 col-md-6">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                Account Information
                            </h5>


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
                                    Department
                                </small>

                                <div className="fw-semibold">
                                    {user?.departmentCode}
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </FacultyLayout>
    );
}

export default FacultyDashboard;