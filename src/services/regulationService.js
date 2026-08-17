import api from "./api";

export const getAllRegulations = async () => {
    const response = await api.get(
        "/api/regulations"
    );

    return response.data;
};

export const createRegulation = async (regulation) => {
    const response = await api.post(
        "/api/regulations",
        regulation
    );

    return response.data;
};

export const updateRegulation = async (
    code,
    regulation
) => {
    const response = await api.put(
        `/api/regulations/${code}`,
        regulation
    );

    return response.data;
};

export const deleteRegulation = async (code) => {
    const response = await api.delete(
        `/api/regulations/${code}`
    );

    return response.data;
};