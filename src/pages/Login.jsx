import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";


function Login() {

    const navigate = useNavigate();

    const { login } = useAuth();

    const [employeeId, setEmployeeId] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const handleSubmit = async (event) => {

        event.preventDefault();


        if (!employeeId.trim()) {

            toast.error(
                "Please enter Employee ID"
            );

            return;
        }

        if (!password.trim()) {

            toast.error(
                "Please enter password"
            );

            return;
        }

        try {

            setLoading(true);

            // -----------------------------
            // CALL BACKEND LOGIN API
            // -----------------------------

            const user = await login(
                employeeId,
                password
            );

            console.log(
                "Logged in user:",
                user
            );

            toast.success(
                "Login successful"
            );

            // -----------------------------
            // ROLE BASED REDIRECTION
            // -----------------------------

            if (user.role === "ADMIN") {

                navigate("/admin");

            } else if (
                user.role === "HOD"
                ||
                user.role === "DEAN"
            ) {

                navigate("/faculty");

            } else {

                toast.error(
                    "Invalid user role"
                );
            }

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            // Backend error message
            const message =
                error.response
                    ?.data
                    ?.message
                ||
                "Invalid Employee ID or password";

            toast.error(message);

        } finally {

            setLoading(false);
        }
    };

    return (
        <div
            className="container-fluid min-vh-100 d-flex justify-content-center align-items-center"
        >

            <div
                className="card shadow border-0"
                style={{
                    width: "400px"
                }}
            >

                <div className="card-body p-4">

                    {/* LOGO / TITLE */}

                    <div className="text-center mb-4">

                        <i
                            className="bi bi-mortarboard-fill"
                            style={{
                                fontSize: "45px"
                            }}
                        />

                        <h3 className="mt-2">
                            SRU Curriculum
                        </h3>

                        <p className="text-muted">
                            Sign in to continue
                        </p>

                    </div>

                    {/* LOGIN FORM */}

                    <form
                        onSubmit={handleSubmit}
                    >

                        {/* EMPLOYEE ID */}

                        <div className="mb-3">

                            <label className="form-label">
                                Employee ID
                            </label>

                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter employee ID"
                                value={employeeId}
                                onChange={(event) =>
                                    setEmployeeId(
                                        event.target.value
                                    )
                                }
                            />

                        </div>

                        {/* PASSWORD */}

                        <div className="mb-4">

                            <label className="form-label">
                                Password
                            </label>

                            <input
                                type="password"
                                className="form-control"
                                placeholder="Enter password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value
                                    )
                                }
                            />

                        </div>

                        {/* LOGIN BUTTON */}

                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                            disabled={loading}
                        >

                            {loading ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                    />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-box-arrow-in-right me-2" />
                                    Login
                                </>
                            )}

                        </button>

                    </form>

                </div>

            </div>

        </div>
    );
}

export default Login;