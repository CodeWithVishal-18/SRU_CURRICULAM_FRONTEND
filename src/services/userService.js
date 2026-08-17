import api from "./api";

// =====================================================
// GET ALL HOD / DEAN
// =====================================================

export const getAllUsers = async () => {

    const response = await api.get(
        "/api/admin/users"
    );

    return response.data;
};


// =====================================================
// GET USER BY EMPLOYEE ID
// =====================================================

export const getUserByEmployeeId = async (
    employeeId
) => {

    const response = await api.get(
        `/api/admin/users/${employeeId}`
    );

    return response.data;
};


// =====================================================
// CREATE HOD / DEAN
// =====================================================

export const createUser = async (user) => {

    const response = await api.post(
        "/api/admin/users",
        user
    );

    return response.data;
};


// =====================================================
// UPDATE BY EMPLOYEE ID
// =====================================================

export const updateUser = async (
    employeeId,
    user
) => {

    const response = await api.put(
        `/api/admin/users/${employeeId}`,
        user
    );

    return response.data;
};


// =====================================================
// DELETE BY EMPLOYEE ID
// =====================================================

export const deleteUser = async (
    employeeId
) => {

    const response = await api.delete(
        `/api/admin/users/${employeeId}`
    );

    return response.data;
};