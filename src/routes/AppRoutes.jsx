import {
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "../pages/Login";
import { useAuth } from "../context/AuthContext";
import AdminDashboard from "../pages/admin/AdminDashboard";
import Regulations from "../pages/admin/Regulations";
import Departments from "../pages/admin/Departments";
import Employees from "../pages/admin/Employees";
import CourseStructure from "../pages/admin/CourseStructure";
import CourseStructureView from "../pages/admin/CourseStructureView";
import Curriculum from "../pages/admin/Curriculum";
import FacultyDashboard from "../pages/faculty/FacultyDashboard";
import FacultyCurriculum from "../pages/faculty/FacultyCurriculum";

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>

            <Route
                path="/login"
                element={
                    user
                        ? (
                            <Navigate
                                to={
                                    user.role === "ADMIN"
                                        ? "/admin"
                                        : "/faculty"
                                }
                            />
                        )
                        : <Login />
                }
            />
            <Route
                path="/admin/employees"
                element={
                    user?.role === "ADMIN"
                        ? <Employees />
                        : <Navigate to="/login" />
                }
            />
            <Route
                path="/admin/course-structure"
                element={
                    user?.role === "ADMIN"
                        ? <CourseStructure />
                        : <Navigate to="/login" />
                }
            />
            <Route
                path="/admin/course-structure/view"
                element={
                    user?.role === "ADMIN"
                        ? <CourseStructureView />
                        : <Navigate to="/login" />
                }
            />
            <Route
                path="/admin"
                element={
                    user?.role === "ADMIN"
                        ? <AdminDashboard />
                        : <Navigate
                            to="/login"
                        />
                }
            />

            <Route
                path="/faculty"
                element={
                    user &&
                        (
                            user.role === "HOD" ||
                            user.role === "DEAN"
                        )
                        ? <FacultyDashboard />
                        : <Navigate to="/login" />
                }
            />
            <Route
                path="/faculty/dashboard"
                element={
                    user &&
                        (
                            user.role === "HOD" ||
                            user.role === "DEAN"
                        )
                        ? <FacultyDashboard />
                        : <Navigate to="/login" />
                }
            />

            <Route
                path="/faculty/curriculum"
                element={
                    user &&
                        (
                            user.role === "HOD" ||
                            user.role === "DEAN"
                        )
                        ? <FacultyCurriculum />
                        : <Navigate to="/login" />
                }
            />
            <Route
                path="/admin/curriculum"
                element={
                    user?.role === "ADMIN"
                        ? <Curriculum />
                        : <Navigate to="/login" />
                }
            />
            <Route
                path="/admin/regulations"
                element={
                    user?.role === "ADMIN"
                        ? <Regulations />
                        : <Navigate to="/login" />
                }
            />
            <Route
                path="/admin/departments"
                element={
                    user?.role === "ADMIN"
                        ? <Departments />
                        : <Navigate to="/login" />
                }
            />

            <Route
                path="*"
                element={
                    <Navigate
                        to="/login"
                    />
                }
            />

        </Routes>
    );
}

export default AppRoutes;