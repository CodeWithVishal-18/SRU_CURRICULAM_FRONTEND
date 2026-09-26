import api from "./api";

export const getAllPrograms = async () => {
    const response = await api.get("/api/programs");
    return response.data;
};

export const getProgramsByDepartment = async (deptCode) => {
    const response = await api.get(`/api/programs/department/${deptCode}`);
    return response.data;
};

export const getProgramsByDepartmentAndLevel = async (deptCode, level) => {
    const response = await api.get(`/api/programs/department/${deptCode}/level/${level}`);
    return response.data;
};

export const createProgram = async (programData) => {
    const response = await api.post("/api/programs", programData);
    return response.data;
};

export const updateProgram = async (code, programData) => {
    const response = await api.put(`/api/programs/${code}`, programData);
    return response.data;
};

export const deleteProgram = async (code) => {
    const response = await api.delete(`/api/programs/${code}`);
    return response.data;
};