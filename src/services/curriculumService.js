import api from "./api";

// =====================================================
// GET SEMESTER CURRICULUM
// =====================================================

export const getSemesterCurriculum = async (
    regulationCode,
    departmentCode,
    semester
) => {

    const response = await api.get(
        `/api/curriculum/${regulationCode}/${departmentCode}/${semester}`
    );

    return response.data;
};


// =====================================================
// GET ELECTIVE SUBJECTS
// =====================================================

export const getElectiveSubjects = async (
    electiveGroupId
) => {

    const response = await api.get(
        `/api/curriculum/elective/${electiveGroupId}/subjects`
    );

    return response.data;
};


// =====================================================
// SUBMIT ELECTIVE SELECTIONS
// =====================================================

export const selectElectives = async (
    regulationCode,
    departmentCode,
    semester,
    payload
) => {
    const response = await api.put(
        `/api/curriculum/${regulationCode}/${departmentCode}/${semester}/electives`,
        payload
    );

    return response.data;
};