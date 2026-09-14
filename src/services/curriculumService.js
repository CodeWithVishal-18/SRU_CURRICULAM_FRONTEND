import api from "./api";

// =====================================================
// GET SEMESTER CURRICULUM WITH SYLLABUS DETAILS
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

export const getElectiveSubjects = async (electiveGroupId) => {
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
    selections
) => {
    const response = await api.put(
        `/api/curriculum/${regulationCode}/${departmentCode}/${semester}/electives`,
        {
            selections
        }
    );

    return response.data;
};

// =====================================================
// UPLOAD COURSE SYLLABUS
// =====================================================

export const uploadCourseSyllabus = async (courseId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
        `/api/syllabi/course/${courseId}`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;
};

// =====================================================
// UPLOAD ELECTIVE SUBJECT SYLLABUS
// =====================================================

export const uploadElectiveSubjectSyllabus = async (
    subjectId,
    file
) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
        `/api/syllabi/elective-subject/${subjectId}`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;
};

// =====================================================
// GET COURSE SYLLABUS STATUS
// =====================================================

export const getCourseSyllabusStatus = async (courseId) => {
    const response = await api.get(
        `/api/syllabi/course/${courseId}/status`
    );

    return response.data;
};

// =====================================================
// GET ELECTIVE SUBJECT SYLLABUS STATUS
// =====================================================

export const getElectiveSubjectSyllabusStatus = async (subjectId) => {
    const response = await api.get(
        `/api/syllabi/elective-subject/${subjectId}/status`
    );

    return response.data;
};

// =====================================================
// GET SYLLABUS FILE URL
// =====================================================

export const getSyllabusFileUrl = (syllabusId) => {
    return `/api/syllabi/${syllabusId}/file`;
};

// =====================================================
// UPDATE SYLLABUS STATUS
// =====================================================

export const updateSyllabusStatus = async (
    syllabusId,
    status,
    rejectionReason = ""
) => {
    const response = await api.put(
        `/api/syllabi/${syllabusId}/status`,
        {
            status: String(status).trim().toUpperCase(),
            rejectionReason: String(rejectionReason || "").trim(),
        }
    );

    return response.data;
};