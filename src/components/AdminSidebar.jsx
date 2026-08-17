import { NavLink } from "react-router-dom";

function AdminSidebar() {

    const menuItems = [
        {
            name: "Dashboard",
            path: "/admin",
            icon: "bi-speedometer2"
        },
        {
            name: "Regulations",
            path: "/admin/regulations",
            icon: "bi-journal-text"
        },
        {
            name: "Departments",
            path: "/admin/departments",
            icon: "bi-building"
        },
        {
            name: "HOD / DEAN",
            path: "/admin/employees",
            icon: "bi-people"
        },
        {
            name: "Course Structure",
            path: "/admin/course-structure",
            icon: "bi-file-earmark-spreadsheet"
        },
        {
            name: "View Courses",
            path: "/admin/course-structure/view",
            icon: "bi-journal-text"
        },
        {
            name: "Curriculum",
            path: "/admin/curriculum",
            icon: "bi-mortarboard"
        }
    ];

    return (
        <>

            {/* DESKTOP SIDEBAR */}

            <aside
                className="d-none d-lg-flex flex-column bg-dark text-white position-fixed top-0 start-0 bottom-0"
                style={{
                    width: "250px",
                    paddingTop: "73px"
                }}
            >

                <div className="p-3">

                    <div className="text-uppercase text-secondary small fw-semibold mb-3">
                        Administration
                    </div>

                    <nav>

                        {menuItems.map((item) => (

                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === "/admin"}
                                className={({ isActive }) =>
                                    `d-flex align-items-center text-decoration-none rounded-3 px-3 py-2 mb-1 ${isActive
                                        ? "bg-primary text-white"
                                        : "text-white-50"
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

                        ))}

                    </nav>

                </div>

                {/* SIDEBAR BOTTOM */}

                <div className="mt-auto p-3 border-top border-secondary">

                    <div className="small text-white-50">
                        SRU Curriculum Portal
                    </div>

                    <div className="small text-white-50">
                        Administration Panel
                    </div>

                </div>

            </aside>


            {/* MOBILE SIDEBAR */}

            <div
                className="offcanvas offcanvas-start bg-dark text-white"
                tabIndex="-1"
                id="adminSidebar"
            >

                <div className="offcanvas-header">

                    <h5 className="offcanvas-title">
                        <i className="bi bi-mortarboard-fill me-2"></i>
                        SRU Curriculum
                    </h5>

                    <button
                        type="button"
                        className="btn-close btn-close-white"
                        data-bs-dismiss="offcanvas"
                    ></button>

                </div>

                <div className="offcanvas-body">

                    <div className="text-uppercase text-secondary small fw-semibold mb-3">
                        Administration
                    </div>

                    {menuItems.map((item) => (

                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/admin"}
                            className={({ isActive }) =>
                                `d-flex align-items-center text-decoration-none rounded-3 px-3 py-2 mb-1 ${isActive
                                    ? "bg-primary text-white"
                                    : "text-white-50"
                                }`
                            }
                            data-bs-dismiss="offcanvas"
                        >

                            <i
                                className={`bi ${item.icon} me-3`}
                            ></i>

                            {item.name}

                        </NavLink>

                    ))}

                </div>

            </div>

        </>
    );
}

export default AdminSidebar;