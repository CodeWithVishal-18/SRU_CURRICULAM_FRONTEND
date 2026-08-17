import api from "./api";

export const getAllDepartments = async () => {
    const response = await api.get(
        "/api/departments"
    );

    return response.data;
};

export const getDepartmentByCode = async (code) => {
    const response = await api.get(
        `/api/departments/${code}`
    );

    return response.data;
};

export const createDepartment = async (department) => {
    const response = await api.post(
        "/api/departments",
        department
    );

    return response.data;
};

export const updateDepartment = async (
    code,
    department
) => {
    const response = await api.put(
        `/api/departments/${code}`,
        department
    );

    return response.data;
};

export const deleteDepartment = async (code) => {
    const response = await api.delete(
        `/api/departments/${code}`
    );

    return response.data;
};