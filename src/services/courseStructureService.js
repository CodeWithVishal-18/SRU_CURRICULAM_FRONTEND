import api from "./api";

export const uploadCourseStructure = async (
    regulationCode,
    departmentCode,
    file
) => {

    const formData = new FormData();

    formData.append(
        "regulationCode",
        regulationCode
    );

    formData.append(
        "departmentCode",
        departmentCode
    );

    formData.append(
        "file",
        file
    );

    const response = await api.post(
        "/api/admin/course-structures/upload",
        formData
    );

    return response.data;
};