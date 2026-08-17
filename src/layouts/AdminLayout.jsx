import AdminNavbar from "../components/AdminNavbar";
import AdminSidebar from "../components/AdminSidebar";

function AdminLayout({ children }) {

    return (
        <div className="min-vh-100 bg-light">

            <AdminNavbar />

            <AdminSidebar />

            <main
                style={{
                    marginLeft: "250px"
                }}
                className="p-3 p-lg-4">
                {children}

            </main>

            <style>
                {`
                    @media (max-width: 991.98px) {
                        main {
                            margin-left: 0 !important;
                        }
                    }
                `}
            </style>

        </div>
    );
}

export default AdminLayout;