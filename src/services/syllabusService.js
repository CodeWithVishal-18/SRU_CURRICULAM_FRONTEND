import api from "./api";

/*
 * Get complete syllabus structure for a semester.
 */
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

/*
 * Upload syllabus for a normal course.
 */
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
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;
};

/*
 * Upload syllabus for an elective subject.
 */
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
                "Content-Type": "multipart/form-data"
            }
        }
    );

    return response.data;
};

/*
 * Get syllabus details.
 */
export const getSyllabus = async (syllabusId) => {
    const response = await api.get(
        `/api/syllabi/${syllabusId}`
    );

    return response.data;
};

/*
 * Get syllabus file URL.
 *
 * This is useful for opening the file in a new tab.
 */
export const getSyllabusFileUrl = (syllabusId) => {
    const baseURL =
        api.defaults.baseURL || "";

    return `${baseURL}/api/syllabi/${syllabusId}/file`;
};

/*
 * Admin approves or rejects syllabus.
 */
export const updateSyllabusStatus = async (
    syllabusId,
    status,
    rejectionReason = null
) => {
    const response = await api.put(
        `/api/syllabi/${syllabusId}/status`,
        {
            status,
            rejectionReason
        }
    );

    return response.data;
};