import api from "./api";

// =====================================================
// GET ALL COURSES
// =====================================================

export const getCourses = async (
    regulationCode,
    departmentCode
) => {

    const response = await api.get(
        `/api/courses/${regulationCode}/${departmentCode}`
    );

    return response.data;
};


// =====================================================
// GET COURSES BY SEMESTER
// =====================================================

export const getCoursesBySemester = async (
    regulationCode,
    departmentCode,
    semester
) => {

    const response = await api.get(
        `/api/courses/${regulationCode}/${departmentCode}/semester/${semester}`
    );

    return response.data;
};


// =====================================================
// GET SINGLE COURSE
// =====================================================

export const getCourse = async (
    regulationCode,
    departmentCode,
    courseCode
) => {

    const response = await api.get(
        `/api/courses/${regulationCode}/${departmentCode}/course/${courseCode}`
    );

    return response.data;
};