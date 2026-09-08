import api from "./api";

// =====================================================
// GET COMPLETE CURRICULUM - ALL 8 SEMESTERS
// =====================================================

export const getAdminSemesterCurriculum = async (
    regulationCode,
    departmentCode
) => {
    const response = await api.get(
        `/api/admin/curriculum/${regulationCode}/${departmentCode}`
    );

    return response.data;
};


// =====================================================
// GET SINGLE SEMESTER CURRICULUM
// =====================================================

export const getAdminSingleSemesterCurriculum = async (
    regulationCode,
    departmentCode,
    semester
) => {
    const response = await api.get(
        `/api/admin/curriculum/${regulationCode}/${departmentCode}/${semester}`
    );

    return response.data;
};


// =====================================================
// GET ELECTIVE SUBJECTS
// =====================================================

export const getAdminElectiveSubjects = async (
    electiveGroupId
) => {
    const response = await api.get(
        `/api/admin/curriculum/elective/${electiveGroupId}/subjects`
    );

    return response.data;
};


// =====================================================
// UPDATE ELECTIVE SELECTIONS
// =====================================================

export const updateAdminElectives = async (
    regulationCode,
    departmentCode,
    semester,
    selections
) => {
    const response = await api.put(
        `/api/admin/curriculum/${regulationCode}/${departmentCode}/${semester}/electives`,
        {
            selections
        }
    );

    return response.data;
};


// =====================================================
// DELETE ELECTIVE SELECTION
// =====================================================

export const deleteAdminElectiveSelection = async (
    selectionId
) => {
    const response = await api.delete(
        `/api/admin/curriculum/elective/selection/${selectionId}`
    );

    return response.data;
};


// =====================================================
// DELETE ELECTIVE GROUP
// =====================================================

export const deleteAdminElectiveGroup = async (
    groupId
) => {
    const response = await api.delete(
        `/api/admin/curriculum/elective/group/${groupId}`
    );

    return response.data;
};