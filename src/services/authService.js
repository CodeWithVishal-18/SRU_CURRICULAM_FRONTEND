import api from "./api";

export const loginUser = async (employeeId, password) => {

    const response = await api.post(
        "/api/auth/login",
        {
            employeeId: employeeId,
            password: password
        }
    );

    return response.data;
};

export const logoutUser = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
};