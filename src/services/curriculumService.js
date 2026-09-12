import api from "./api";

// =====================================================
// NORMAL CURRICULUM
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
// CURRICULUM WITH SYLLABUS DETAILS
// =====================================================

export const getCurriculumSyllabus = async (
    regulationCode,
    departmentCode,
    semester
) => {
    const response = await api.get(
        `/api/syllabi/curriculum/${regulationCode}/${departmentCode}/${semester}`
    );

    return response.data;
};

// =====================================================
// ELECTIVE SUBJECTS
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
// GET COURSE SYLLABUS STATUS
// =====================================================

export const getCourseSyllabusStatus = async (
    courseId
) => {
    const response = await api.get(
        `/api/syllabi/course/${courseId}/status`
    );

    return response.data;
};

// =====================================================
// GET ELECTIVE SUBJECT SYLLABUS STATUS
// =====================================================

export const getElectiveSubjectSyllabusStatus = async (
    electiveSubjectId
) => {
    const response = await api.get(
        `/api/syllabi/elective-subject/${electiveSubjectId}/status`
    );

    return response.data;
};

// =====================================================
// GET SYLLABUS DETAILS
// =====================================================

export const getSyllabus = async (syllabusId) => {
    const response = await api.get(
        `/api/syllabi/${syllabusId}`
    );

    return response.data;
};

// =====================================================
// SYLLABUS FILE URL
// =====================================================

export const getSyllabusFileUrl = (syllabusId) => {
    return `/api/syllabi/${syllabusId}/file`;
};

// =====================================================
// UPLOAD COURSE SYLLABUS
// =====================================================

export const uploadCourseSyllabus = async (
    courseId,
    file
) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
        `/api/syllabi/course/${courseId}`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response.data;
};

// =====================================================
// UPLOAD ELECTIVE SUBJECT SYLLABUS
// =====================================================

export const uploadElectiveSubjectSyllabus = async (
    electiveSubjectId,
    file
) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
        `/api/syllabi/elective-subject/${electiveSubjectId}`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response.data;
};

// =====================================================
// UPDATE SYLLABUS STATUS
// =====================================================

export const updateSyllabusStatus = async (
    syllabusId,
    status,
    remarks
) => {
    const response = await api.put(
        `/api/syllabi/${syllabusId}/status`,
        {
            status,
            remarks,
        }
    );

    return response.data;
};

// =====================================================
// SELECT ELECTIVES
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