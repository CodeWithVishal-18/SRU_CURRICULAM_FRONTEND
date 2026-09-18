import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import AdminLayout from "../../layouts/AdminLayout";

import { getAllRegulations } from "../../services/regulationService";
import { getAllDepartments } from "../../services/departmentService";

import {
    getAdminSemesterCurriculum,
    getAdminElectiveSubjects,
    updateAdminElectives,
    deleteAdminElectiveSelection,
    deleteAdminElectiveGroup
} from "../../services/adminCurriculumService";

import {
    uploadCourseSyllabus,
    uploadElectiveSubjectSyllabus,
    getCourseSyllabusStatus,
    getElectiveSubjectSyllabusStatus,
    getSyllabusFileUrl,
    updateSyllabusStatus
} from "../../services/curriculumService";

import api from "../../services/api";

function CourseStructureView() {
    const [regulations, setRegulations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [regulationCode, setRegulationCode] = useState("");
    const [departmentCode, setDepartmentCode] = useState("");
    const [curriculum, setCurriculum] = useState(null);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingCurriculum, setLoadingCurriculum] = useState(false);
    const [expandedSemesters, setExpandedSemesters] = useState([]);
    const [expandedElectiveGroups, setExpandedElectiveGroups] = useState([]);

    // Elective subjects are loaded only when an elective group is expanded.
    const [subjectCache, setSubjectCache] = useState({});
    const [subjectLoading, setSubjectLoading] = useState({});

    // Elective selection modal.
    const [showElectiveModal, setShowElectiveModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [electiveSubjects, setElectiveSubjects] = useState([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [savingElectives, setSavingElectives] = useState(false);

    // Admin syllabus modal.
    const [showSyllabusModal, setShowSyllabusModal] = useState(false);
    const [selectedSyllabusItem, setSelectedSyllabusItem] = useState(null);
    const [selectedSyllabusType, setSelectedSyllabusType] = useState("course");
    const [selectedSyllabusFile, setSelectedSyllabusFile] = useState(null);
    const [syllabusRemarks, setSyllabusRemarks] = useState("");
    const [syllabusUploading, setSyllabusUploading] = useState(false);
    const [syllabusStatusUpdating, setSyllabusStatusUpdating] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [regulationResponse, departmentResponse] = await Promise.all([
                    getAllRegulations(),
                    getAllDepartments()
                ]);

                setRegulations(regulationResponse?.data || []);
                setDepartments(departmentResponse?.data || []);
            } catch (error) {
                console.error("Failed to load initial data:", error);
                toast.error(
                    error?.response?.data?.message ||
                    "Failed to load regulations or departments"
                );
            } finally {
                setLoadingInitial(false);
            }
        };

        loadInitialData();
    }, []);

    const normalizeStatus = (status) => {
        const value = String(status || "").trim().toUpperCase();
        if (value === "UPLOADED" || value === "UNDER_REVIEW") return "PENDING";
        if (["APPROVED", "REJECTED", "PENDING", "NOT_UPLOADED"].includes(value)) {
            return value;
        }
        return "NOT_UPLOADED";
    };

    const getSyllabusObject = (item) => (
        item?.syllabus ||
        item?.syllabusResponse ||
        item?.syllabusDetails ||
        item?.syllabusFile ||
        null
    );

    const getSyllabusId = (item) => {
        const syllabus = getSyllabusObject(item);
        return (
            item?.syllabusId ||
            item?.syllabusID ||
            item?.uploadedSyllabusId ||
            syllabus?.id ||
            syllabus?.syllabusId ||
            syllabus?.syllabusID ||
            syllabus?.uploadedSyllabusId ||
            null
        );
    };

    const getSyllabusStatus = (item) => {
        const syllabus = getSyllabusObject(item);
        const rawStatus =
            item?.syllabusStatus ??
            item?.status ??
            syllabus?.syllabusStatus ??
            syllabus?.status;

        // A missing syllabus record must always be shown as Not Uploaded.
        const syllabusId = getSyllabusId(item);
        if (!rawStatus && !syllabusId) return "NOT_UPLOADED";
        if (!rawStatus && syllabusId) return "PENDING";
        return normalizeStatus(rawStatus);
    };

    const getStatusLabel = (status) => {
        switch (normalizeStatus(status)) {
            case "APPROVED":
                return "Approved";
            case "REJECTED":
                return "Rejected";
            case "PENDING":
                return "Awaiting Syllabus Review";
            default:
                return "Awaiting Syllabus";
        }
    };

    const getStatusClass = (status) => {
        switch (normalizeStatus(status)) {
            case "APPROVED":
                return "bg-success-subtle text-success";
            case "REJECTED":
                return "bg-danger-subtle text-danger";
            case "PENDING":
                return "bg-warning-subtle text-warning-emphasis";
            default:
                return "bg-secondary-subtle text-secondary";
        }
    };

    const extractSyllabusData = (response, fallbackItem) => {
        const data = response?.data ?? response ?? {};
        const syllabus = data?.syllabus || data?.syllabusDetails || data?.syllabusFile || null;
        const source = syllabus || data || {};

        const syllabusId =
            data?.syllabusId ||
            data?.id ||
            source?.syllabusId ||
            source?.id ||
            getSyllabusId(fallbackItem) ||
            null;

        return {
            syllabusId,
            syllabusStatus: normalizeStatus(
                data?.syllabusStatus ||
                data?.status ||
                source?.status ||
                (syllabusId ? "PENDING" : "NOT_UPLOADED")
            ),
            fileName:
                data?.fileName ||
                data?.originalFileName ||
                source?.fileName ||
                source?.originalFileName ||
                fallbackItem?.fileName ||
                null,
            syllabus: source
        };
    };

    const loadCourseWithStatus = async (course) => {
        try {
            const response = await getCourseSyllabusStatus(course.id);
            return { ...course, ...extractSyllabusData(response, course) };
        } catch (error) {
            console.warn(`Unable to load syllabus status for course ${course?.id}`, error);
            return {
                ...course,
                syllabusStatus: getSyllabusStatus(course)
            };
        }
    };

    const loadElectiveSubjectWithStatus = async (subject) => {
        try {
            const response = await getElectiveSubjectSyllabusStatus(subject.id);
            return { ...subject, ...extractSyllabusData(response, subject) };
        } catch (error) {
            console.warn(`Unable to load syllabus status for subject ${subject?.id}`, error);
            return {
                ...subject,
                syllabusStatus: getSyllabusStatus(subject)
            };
        }
    };

    const normalizeCurriculumResponse = (response) => {
        const data = response?.data ?? response ?? {};
        if (Array.isArray(data)) {
            return { semesters: data };
        }
        return data || { semesters: [] };
    };

    const handleLoadCurriculum = async () => {
        if (!regulationCode) {
            toast.error("Please select a regulation");
            return;
        }
        if (!departmentCode) {
            toast.error("Please select a department");
            return;
        }

        try {
            setLoadingCurriculum(true);
            setSubjectCache({});
            setExpandedElectiveGroups([]);

            const response = await getAdminSemesterCurriculum(
                regulationCode,
                departmentCode
            );

            const rawCurriculum = normalizeCurriculumResponse(response);
            const rawSemesters = Array.isArray(rawCurriculum?.semesters)
                ? rawCurriculum.semesters
                : [];

            // Load syllabus status for every core course in every semester.
            const semestersWithStatuses = await Promise.all(
                rawSemesters.map(async (semesterData, semesterIndex) => {
                    const semesterNumber = Number(
                        semesterData?.semester ??
                        semesterData?.semesterNumber ??
                        semesterIndex + 1
                    );

                    const courses = await Promise.all(
                        (semesterData?.courses || []).map(loadCourseWithStatus)
                    );

                    const electives = (semesterData?.electives || []).map((group) => ({
                        ...group,
                        selectedSubjects: Array.isArray(group?.selectedSubjects)
                            ? group.selectedSubjects
                            : []
                    }));

                    return {
                        ...semesterData,
                        semester: semesterNumber,
                        courses,
                        electives
                    };
                })
            );

            semestersWithStatuses.sort((a, b) => a.semester - b.semester);

            const loadedCurriculum = {
                ...rawCurriculum,
                regulationCode: rawCurriculum?.regulationCode || regulationCode,
                departmentCode: rawCurriculum?.departmentCode || departmentCode,
                semesters: semestersWithStatuses
            };

            setCurriculum(loadedCurriculum);
            setExpandedSemesters(semestersWithStatuses.map((item) => item.semester));
        } catch (error) {
            console.error("Failed to load curriculum:", error);
            toast.error(
                error?.response?.data?.message ||
                "Failed to load curriculum"
            );
            setCurriculum(null);
        } finally {
            setLoadingCurriculum(false);
        }
    };

    const handleRegulationChange = (event) => {
        setRegulationCode(event.target.value);
        setCurriculum(null);
        setExpandedSemesters([]);
        setSubjectCache({});
    };

    const handleDepartmentChange = (event) => {
        setDepartmentCode(event.target.value);
        setCurriculum(null);
        setExpandedSemesters([]);
        setSubjectCache({});
    };

    const toggleSemester = (semesterNumber) => {
        setExpandedSemesters((previous) => (
            previous.includes(semesterNumber)
                ? previous.filter((item) => item !== semesterNumber)
                : [...previous, semesterNumber]
        ));
    };

    const expandAll = () => {
        setExpandedSemesters(
            curriculum?.semesters?.map((item) => item.semester) || []
        );
    };

    const collapseAll = () => setExpandedSemesters([]);

    const getGroupKey = (semesterNumber, groupId) => `${semesterNumber}-${groupId}`;

    const toggleElectiveGroup = async (group, semesterNumber) => {
        const groupId = group?.id || group?.electiveGroupId;
        if (!groupId) {
            toast.error("Elective group ID is missing");
            return;
        }

        const key = getGroupKey(semesterNumber, groupId);
        const isExpanded = expandedElectiveGroups.includes(key);

        setExpandedElectiveGroups((previous) => (
            isExpanded
                ? previous.filter((item) => item !== key)
                : [...previous, key]
        ));

        if (isExpanded || subjectCache[key]) return;

        try {
            setSubjectLoading((previous) => ({ ...previous, [key]: true }));
            const response = await getAdminElectiveSubjects(groupId);
            const data = response?.data ?? response ?? [];
            const rawSubjects = Array.isArray(data)
                ? data
                : data?.subjects || data?.content || data?.items || data?.data || [];

            const subjectsWithStatuses = await Promise.all(
                rawSubjects.map(loadElectiveSubjectWithStatus)
            );

            setSubjectCache((previous) => ({
                ...previous,
                [key]: subjectsWithStatuses
            }));
        } catch (error) {
            console.error("Failed to load elective subjects:", error);
            toast.error(
                error?.response?.data?.message ||
                "Failed to load elective subjects"
            );
            setSubjectCache((previous) => ({ ...previous, [key]: [] }));
        } finally {
            setSubjectLoading((previous) => ({ ...previous, [key]: false }));
        }
    };

    const handleOpenElectiveModal = async (group, semesterNumber) => {
        try {
            setSelectedGroup({ ...group, semesterNumber });
            setShowElectiveModal(true);
            setLoadingSubjects(true);

            const groupId = group?.id || group?.electiveGroupId;
            const response = await getAdminElectiveSubjects(groupId);
            const data = response?.data ?? response ?? [];
            const rawSubjects = Array.isArray(data)
                ? data
                : data?.subjects || data?.content || data?.items || data?.data || [];

            setElectiveSubjects(rawSubjects);
            setSelectedSubjectIds(
                (group?.selectedSubjects || []).map((subject) => Number(subject.id))
            );
        } catch (error) {
            console.error("Failed to load elective subjects:", error);
            toast.error(
                error?.response?.data?.message ||
                "Failed to load elective subjects"
            );
            setShowElectiveModal(false);
        } finally {
            setLoadingSubjects(false);
        }
    };

    const handleCloseElectiveModal = () => {
        if (savingElectives) return;
        setShowElectiveModal(false);
        setSelectedGroup(null);
        setElectiveSubjects([]);
        setSelectedSubjectIds([]);
    };

    const toggleSubject = (subjectId) => {
        const id = Number(subjectId);
        setSelectedSubjectIds((previous) => (
            previous.includes(id)
                ? previous.filter((item) => item !== id)
                : [...previous, id]
        ));
    };

    const replaceSemesterInState = (semesterNumber, updatedSemester) => {
        setCurriculum((previous) => {
            if (!previous) return previous;
            return {
                ...previous,
                semesters: (previous.semesters || []).map((semester) => (
                    Number(semester.semester) === Number(semesterNumber)
                        ? updatedSemester
                        : semester
                ))
            };
        });
    };

    const handleSaveElectives = async () => {
        if (!selectedGroup) return;

        try {
            setSavingElectives(true);
            const semesterNumber = selectedGroup.semesterNumber;
            const semesterData = curriculum?.semesters?.find(
                (item) => Number(item.semester) === Number(semesterNumber)
            );

            if (!semesterData) {
                toast.error("Semester data not found");
                return;
            }

            const selections = [];
            (semesterData.electives || []).forEach((group) => {
                const groupId = group.id || group.electiveGroupId;
                if (Number(groupId) === Number(selectedGroup.id)) {
                    selectedSubjectIds.forEach((subjectId) => {
                        selections.push({ electiveGroupId: groupId, subjectId });
                    });
                } else {
                    (group.selectedSubjects || []).forEach((subject) => {
                        selections.push({
                            electiveGroupId: groupId,
                            subjectId: subject.id
                        });
                    });
                }
            });

            const response = await updateAdminElectives(
                regulationCode,
                departmentCode,
                semesterNumber,
                selections
            );

            const updatedSemester = response?.data ?? response;
            replaceSemesterInState(semesterNumber, updatedSemester);
            toast.success("Elective selections updated successfully");
            handleCloseElectiveModal();
        } catch (error) {
            console.error("Failed to save electives:", error);
            toast.error(
                error?.response?.data?.message ||
                "Failed to update elective selections"
            );
        } finally {
            setSavingElectives(false);
        }
    };

    const handleRemoveSelection = async (group, subject, semesterNumber) => {
        if (!window.confirm(`Remove "${subject.courseName || "this subject"}" from this elective group?`)) {
            return;
        }

        try {
            const semesterData = curriculum?.semesters?.find(
                (item) => Number(item.semester) === Number(semesterNumber)
            );
            if (!semesterData) return;

            const remainingSelections = [];
            (semesterData.electives || []).forEach((electiveGroup) => {
                (electiveGroup.selectedSubjects || []).forEach((selectedSubject) => {
                    if (
                        Number(electiveGroup.id) === Number(group.id) &&
                        Number(selectedSubject.id) === Number(subject.id)
                    ) return;

                    remainingSelections.push({
                        electiveGroupId: electiveGroup.id,
                        subjectId: selectedSubject.id
                    });
                });
            });

            const response = await updateAdminElectives(
                regulationCode,
                departmentCode,
                semesterNumber,
                remainingSelections
            );

            replaceSemesterInState(semesterNumber, response?.data ?? response);
            toast.success("Elective removed successfully");
        } catch (error) {
            console.error("Failed to remove elective:", error);
            toast.error(
                error?.response?.data?.message ||
                "Failed to remove elective"
            );
        }
    };

    const handleDeleteGroup = async (group, semesterNumber) => {
        if (!window.confirm(`Delete the entire "${group.name}" elective group?`)) {
            return;
        }

        try {
            await deleteAdminElectiveGroup(group.id);
            setCurriculum((previous) => {
                if (!previous) return previous;
                return {
                    ...previous,
                    semesters: previous.semesters.map((semester) => (
                        Number(semester.semester) === Number(semesterNumber)
                            ? {
                                ...semester,
                                electives: (semester.electives || []).filter(
                                    (elective) => elective.id !== group.id
                                )
                            }
                            : semester
                    ))
                };
            });
            toast.success("Elective group deleted successfully");
        } catch (error) {
            console.error("Failed to delete elective group:", error);
            toast.error(
                error?.response?.data?.message ||
                "Failed to delete elective group"
            );
        }
    };

    const getCategoryBadge = (category) => {
        const labels = {
            CORE: "Core",
            ELECTIVE: "Elective",
            BASIC_SCIENCE: "Basic Science",
            ENGINEERING_SCIENCE: "Engineering Science",
            HUMANITIES: "Humanities",
            LAB: "Lab",
            PROJECT: "Project",
            OTHER: "Other"
        };

        return (
            <span className="badge bg-primary-subtle text-primary">
                {labels[category] || category || "Other"}
            </span>
        );
    };

    const getLTP = (item) => (
        `${item?.lecture ?? 0}-${item?.tutorial ?? 0}-${item?.practical ?? 0}`
    );

    const getSemesterTotals = (semesterData) => {
        let credits = 0;
        let lecture = 0;
        let tutorial = 0;
        let practical = 0;

        (semesterData?.courses || []).forEach((course) => {
            credits += Number(course.credits) || 0;
            lecture += Number(course.lecture) || 0;
            tutorial += Number(course.tutorial) || 0;
            practical += Number(course.practical) || 0;
        });

        (semesterData?.electives || []).forEach((group) => {
            if ((group.selectedSubjects || []).length > 0) {
                credits += Number(group.credits) || 0;
                lecture += Number(group.lecture) || 0;
                tutorial += Number(group.tutorial) || 0;
                practical += Number(group.practical) || 0;
            }
        });

        return {
            credits,
            lecture,
            tutorial,
            practical,
            ltp: `${lecture}-${tutorial}-${practical}`
        };
    };

    const updateCourseState = (updatedItem) => {
        setCurriculum((previous) => {
            if (!previous) return previous;
            return {
                ...previous,
                semesters: previous.semesters.map((semester) => ({
                    ...semester,
                    courses: (semester.courses || []).map((course) => (
                        Number(course.id) === Number(updatedItem.id)
                            ? { ...course, ...updatedItem }
                            : course
                    ))
                }))
            };
        });
    };

    const updateElectiveSubjectState = (updatedItem) => {
        setSubjectCache((previous) => {
            const next = { ...previous };
            Object.keys(next).forEach((key) => {
                next[key] = (next[key] || []).map((subject) => (
                    Number(subject.id) === Number(updatedItem.id)
                        ? { ...subject, ...updatedItem }
                        : subject
                ));
            });
            return next;
        });

        // Also update selected subjects already returned in the curriculum.
        setCurriculum((previous) => {
            if (!previous) return previous;
            return {
                ...previous,
                semesters: previous.semesters.map((semester) => ({
                    ...semester,
                    electives: (semester.electives || []).map((group) => ({
                        ...group,
                        selectedSubjects: (group.selectedSubjects || []).map((subject) => (
                            Number(subject.id) === Number(updatedItem.id)
                                ? { ...subject, ...updatedItem }
                                : subject
                        ))
                    }))
                }))
            };
        });
    };

    const openSyllabusEditor = (item, type = "course") => {
        setSelectedSyllabusItem(item);
        setSelectedSyllabusType(type);
        setSelectedSyllabusFile(null);
        const syllabus = getSyllabusObject(item);
        setSyllabusRemarks(
            syllabus?.rejectionReason ||
            syllabus?.remarks ||
            syllabus?.reviewerComment ||
            item?.rejectionReason ||
            item?.remarks ||
            item?.reviewerComment ||
            ""
        );
        setShowSyllabusModal(true);
    };

    const closeSyllabusEditor = () => {
        if (syllabusUploading || syllabusStatusUpdating) return;
        setShowSyllabusModal(false);
        setSelectedSyllabusItem(null);
        setSelectedSyllabusFile(null);
        setSyllabusRemarks("");
        setSelectedSyllabusType("course");
    };

    const handleViewSyllabus = async (item) => {
        const syllabusId = getSyllabusId(item);
        if (!syllabusId) {
            toast.error("Syllabus has not been uploaded yet");
            return;
        }

        try {
            const response = await api.get(getSyllabusFileUrl(syllabusId), {
                responseType: "blob"
            });
            const blobUrl = window.URL.createObjectURL(response.data);
            window.open(blobUrl, "_blank", "noopener,noreferrer");
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
            console.error("View syllabus error:", error);
            toast.error(
                error?.response?.data?.message ||
                "Unable to open syllabus"
            );
        }
    };

    const handleSyllabusFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error("Only PDF, DOC, and DOCX files are allowed");
            event.target.value = "";
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size must be less than 10 MB");
            event.target.value = "";
            return;
        }

        setSelectedSyllabusFile(file);
    };

    const handleAdminSyllabusUpload = async () => {
        if (!selectedSyllabusItem?.id) {
            toast.error("Unable to identify the selected course or subject");
            return;
        }
        if (!selectedSyllabusFile) {
            toast.error("Please select a syllabus file");
            return;
        }

        try {
            setSyllabusUploading(true);
            const response = selectedSyllabusType === "elective"
                ? await uploadElectiveSubjectSyllabus(
                    selectedSyllabusItem.id,
                    selectedSyllabusFile
                )
                : await uploadCourseSyllabus(
                    selectedSyllabusItem.id,
                    selectedSyllabusFile
                );

            const uploaded = extractSyllabusData(response, selectedSyllabusItem);
            const updatedItem = {
                ...selectedSyllabusItem,
                ...uploaded,
                syllabusStatus: uploaded.syllabusStatus === "NOT_UPLOADED"
                    ? "PENDING"
                    : uploaded.syllabusStatus,
                fileName: uploaded.fileName || selectedSyllabusFile.name
            };

            if (selectedSyllabusType === "elective") {
                updateElectiveSubjectState(updatedItem);
            } else {
                updateCourseState(updatedItem);
            }

            setSelectedSyllabusItem(updatedItem);
            setSelectedSyllabusFile(null);
            const input = document.getElementById("admin-syllabus-file");
            if (input) input.value = "";
            toast.success("Syllabus uploaded successfully. It is now pending review.");
        } catch (error) {
            console.error("Admin syllabus upload error:", error);
            toast.error(
                error?.response?.data?.message ||
                "Failed to upload syllabus"
            );
        } finally {
            setSyllabusUploading(false);
        }
    };

    const handleAdminSyllabusStatus = async (status) => {
        if (!selectedSyllabusItem) {
            toast.error("Please select a syllabus first");
            return;
        }

        const syllabusId = getSyllabusId(selectedSyllabusItem);
        const nextStatus = String(status || "").toUpperCase();
        const currentStatus = getSyllabusStatus(selectedSyllabusItem);
        const rejectionReason = String(syllabusRemarks || "").trim();

        if (!syllabusId) {
            toast.error("Syllabus ID is missing");
            return;
        }
        if (!["APPROVED", "REJECTED"].includes(nextStatus)) {
            toast.error("Invalid syllabus status");
            return;
        }
        if (!["PENDING", "APPROVED"].includes(currentStatus)) {
            toast.error("This syllabus cannot be reviewed in its current state");
            return;
        }
        if (nextStatus === "REJECTED" && !rejectionReason) {
            toast.error("Please enter a rejection reason before rejecting");
            return;
        }

        try {
            setSyllabusStatusUpdating(true);

            if (nextStatus === "REJECTED") {
                if (!window.confirm("Reject this syllabus and delete the uploaded file?")) {
                    return;
                }

                await api.delete(`/syllabi/${syllabusId}/reject`, {
                    data: { rejectionReason }
                });

                const clearedItem = {
                    ...selectedSyllabusItem,
                    syllabusId: null,
                    syllabusStatus: "NOT_UPLOADED",
                    fileName: null,
                    syllabus: null,
                    rejectionReason
                };

                if (selectedSyllabusType === "elective") {
                    updateElectiveSubjectState(clearedItem);
                } else {
                    updateCourseState(clearedItem);
                }

                toast.success("Syllabus rejected and deleted. It can be uploaded again.");
                closeSyllabusEditor();
                return;
            }

            const response = await updateSyllabusStatus(
                syllabusId,
                "APPROVED",
                ""
            );
            const responseData = response?.data ?? response ?? {};
            const updatedItem = {
                ...selectedSyllabusItem,
                syllabusId,
                syllabusStatus: "APPROVED",
                syllabus: {
                    ...getSyllabusObject(selectedSyllabusItem),
                    ...responseData,
                    id: responseData?.id || syllabusId,
                    syllabusId: responseData?.syllabusId || syllabusId,
                    status: "APPROVED",
                    rejectionReason: null,
                    remarks: "",
                    reviewerComment: ""
                }
            };

            if (selectedSyllabusType === "elective") {
                updateElectiveSubjectState(updatedItem);
            } else {
                updateCourseState(updatedItem);
            }

            setSelectedSyllabusItem(updatedItem);
            toast.success("Syllabus approved successfully");
        } catch (error) {
            console.error("Syllabus approval/rejection failed:", error);
            toast.error(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                `Failed to ${nextStatus === "REJECTED" ? "reject" : "approve"} syllabus`
            );
        } finally {
            setSyllabusStatusUpdating(false);
        }
    };

    const renderSyllabusCell = (item, type) => {
        const status = getSyllabusStatus(item);
        const syllabusId = getSyllabusId(item);

        return (
            <div className="d-flex flex-column align-items-start gap-2">
                <span className={`badge ${getStatusClass(status)}`}>
                    {getStatusLabel(status)}
                </span>
                <div className="d-flex gap-2 flex-wrap">
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => openSyllabusEditor(item, type)}
                    >
                        <i className="bi bi-gear me-1"></i>
                        Manage
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleViewSyllabus(item)}
                        disabled={!syllabusId}
                    >
                        <i className="bi bi-eye me-1"></i>
                        View
                    </button>
                </div>
            </div>
        );
    };

    const renderCourses = (courses, semesterNumber) => {
        if (!courses?.length) {
            return (
                <div className="alert alert-light border mb-0">
                    No core courses in this semester.
                </div>
            );
        }

        return (
            <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>#</th>
                            <th>Course Code</th>
                            <th>Course / Subject</th>
                            <th>Category</th>
                            <th>L-T-P</th>
                            <th>Credits</th>
                            <th style={{ minWidth: "230px" }}>Syllabus / Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map((course, index) => (
                            <tr key={`${semesterNumber}-course-${course.id}`}>
                                <td>{index + 1}</td>
                                <td className="fw-semibold">{course.courseCode || "—"}</td>
                                <td className="fw-semibold">{course.courseName || "Unnamed Course"}</td>
                                <td>{getCategoryBadge(course.category)}</td>
                                <td>{getLTP(course)}</td>
                                <td className="fw-semibold">{course.credits ?? 0}</td>
                                <td>{renderSyllabusCell(course, "course")}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderElectiveSubjects = (group, semesterNumber) => {
        const groupId = group?.id || group?.electiveGroupId;
        const key = getGroupKey(semesterNumber, groupId);
        const expanded = expandedElectiveGroups.includes(key);
        const loading = subjectLoading[key];
        const allSubjects = subjectCache[key] || [];

        return (
            <div className="mt-3">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => toggleElectiveGroup(group, semesterNumber)}
                >
                    <i className={`bi ${expanded ? "bi-chevron-up" : "bi-chevron-down"} me-1`}></i>
                    {expanded ? "Hide Subjects" : "View All Subjects"}
                    <span className="badge bg-primary-subtle text-primary ms-2">
                        {allSubjects.length || group.subjectCount || 0}
                    </span>
                </button>

                {expanded && (
                    <div className="mt-3">
                        {loading ? (
                            <div className="text-muted py-3">
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Loading elective subjects...
                            </div>
                        ) : allSubjects.length === 0 ? (
                            <div className="alert alert-light border mb-0">
                                No subjects found for this elective group.
                            </div>
                        ) : (
                            <div className="row g-3">
                                {allSubjects.map((subject) => (
                                    <div className="col-12 col-lg-6" key={`${key}-subject-${subject.id}`}>
                                        <div className="border rounded-3 p-3 h-100 bg-light-subtle">
                                            <div className="d-flex justify-content-between align-items-start gap-2">
                                                <div>
                                                    <div className="fw-bold">
                                                        {subject.courseCode || "—"}
                                                    </div>
                                                    <div>{subject.courseName || "Unnamed Subject"}</div>
                                                </div>
                                                <span className={`badge ${getStatusClass(getSyllabusStatus(subject))}`}>
                                                    {getStatusLabel(getSyllabusStatus(subject))}
                                                </span>
                                            </div>

                                            <div className="small text-muted mt-2">
                                                L-T-P: {getLTP(subject)}
                                                <span className="mx-2">•</span>
                                                Credits: {subject.credits ?? 0}
                                            </div>

                                            <div className="d-flex gap-2 flex-wrap mt-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => openSyllabusEditor(subject, "elective")}
                                                >
                                                    <i className="bi bi-gear me-1"></i>
                                                    Manage
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => handleViewSyllabus(subject)}
                                                    disabled={!getSyllabusId(subject)}
                                                >
                                                    <i className="bi bi-eye me-1"></i>
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderElectives = (electives, semesterNumber) => {
        if (!electives?.length) {
            return (
                <div className="alert alert-light border mb-0">
                    No elective groups in this semester.
                </div>
            );
        }

        return (
            <div className="row g-3">
                {electives.map((group) => {
                    const selectedSubjects = group.selectedSubjects || [];
                    return (
                        <div className="col-12" key={`${semesterNumber}-group-${group.id}`}>
                            <div className="card border shadow-sm">
                                <div className="card-body">
                                    <div className="d-flex flex-column flex-xl-row justify-content-between gap-3">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <h6 className="fw-bold mb-0">
                                                    {group.name || "Unnamed Elective Group"}
                                                </h6>
                                                <span className="badge bg-info-subtle text-info-emphasis">
                                                    {group.electiveType || "ELECTIVE"}
                                                </span>
                                            </div>
                                            <div className="small text-muted mt-2">
                                                L-T-P: {getLTP(group)}
                                                <span className="mx-2">•</span>
                                                Credits: {group.credits ?? 0}
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2 flex-wrap">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => handleOpenElectiveModal(group, semesterNumber)}
                                            >
                                                <i className="bi bi-check2-square me-1"></i>
                                                Manage Selection
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleDeleteGroup(group, semesterNumber)}
                                            >
                                                <i className="bi bi-trash me-1"></i>
                                                Delete Group
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="fw-semibold mb-2">Selected Subjects</div>
                                        {selectedSubjects.length === 0 ? (
                                            <div className="alert alert-light border mb-0">
                                                No subjects selected in this elective group.
                                            </div>
                                        ) : (
                                            <div className="list-group">
                                                {selectedSubjects.map((subject) => (
                                                    <div
                                                        className="list-group-item d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2"
                                                        key={`${group.id}-selected-${subject.id}`}
                                                    >
                                                        <div>
                                                            <div className="fw-semibold">
                                                                {subject.courseCode || "—"} - {subject.courseName || "Unnamed Subject"}
                                                            </div>
                                                            <div className="small text-muted">
                                                                L-T-P: {getLTP(subject)}
                                                                <span className="mx-2">•</span>
                                                                Credits: {subject.credits ?? 0}
                                                            </div>
                                                        </div>
                                                        <div className="d-flex gap-2 flex-wrap">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => openSyllabusEditor(subject, "elective")}
                                                            >
                                                                <i className="bi bi-gear me-1"></i>
                                                                Manage
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => handleRemoveSelection(group, subject, semesterNumber)}
                                                            >
                                                                <i className="bi bi-x-lg me-1"></i>
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {renderElectiveSubjects(group, semesterNumber)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loadingInitial) {
        return (
            <AdminLayout>
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                        <div className="spinner-border text-primary"></div>
                        <p className="text-muted mt-3 mb-0">Loading...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-4">
                <h2 className="fw-bold mb-1">Course Structure</h2>
                <p className="text-muted mb-0">
                    Admin view: inspect every semester, expand elective groups, and upload, approve, reject, or replace syllabi.
                </p>
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        <div className="col-12 col-md-5">
                            <label className="form-label fw-semibold">Regulation</label>
                            <select
                                className="form-select"
                                value={regulationCode}
                                onChange={handleRegulationChange}
                            >
                                <option value="">Select Regulation</option>
                                {regulations.map((regulation) => (
                                    <option key={regulation.code} value={regulation.code}>
                                        {regulation.code}
                                        {regulation.startYear ? ` (${regulation.startYear})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-12 col-md-5">
                            <label className="form-label fw-semibold">Department</label>
                            <select
                                className="form-select"
                                value={departmentCode}
                                onChange={handleDepartmentChange}
                            >
                                <option value="">Select Department</option>
                                {departments.map((department) => (
                                    <option key={department.code} value={department.code}>
                                        {department.name} ({department.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-12 col-md-2">
                            <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={handleLoadCurriculum}
                                disabled={loadingCurriculum}
                            >
                                {loadingCurriculum ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                    <>
                                        <i className="bi bi-search me-2"></i>
                                        Load All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {loadingCurriculum ? (
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                        <div className="spinner-border text-primary"></div>
                        <p className="text-muted mt-3 mb-0">Loading all semester curriculum...</p>
                    </div>
                </div>
            ) : curriculum ? (
                <>
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body">
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                                <div>
                                    <h5 className="fw-bold mb-1">
                                        {curriculum.departmentName || departmentCode}
                                    </h5>
                                    <div className="text-muted">
                                        Regulation: <strong>{curriculum.regulationCode || regulationCode}</strong>
                                        <span className="mx-2">•</span>
                                        Department: <strong>{curriculum.departmentCode || departmentCode}</strong>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={expandAll}>
                                        <i className="bi bi-arrows-expand me-1"></i>
                                        Expand All
                                    </button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={collapseAll}>
                                        <i className="bi bi-arrows-collapse me-1"></i>
                                        Collapse All
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {(curriculum.semesters || []).map((semesterData) => {
                        const semesterNumber = semesterData.semester;
                        const expanded = expandedSemesters.includes(semesterNumber);
                        const totals = getSemesterTotals(semesterData);
                        const courseCount = semesterData.courses?.length || 0;
                        const electiveCount = semesterData.electives?.length || 0;

                        return (
                            <div className="card border-0 shadow-sm mb-4" key={`semester-${semesterNumber}`}>
                                <button
                                    type="button"
                                    className="btn text-start w-100 p-0 border-0"
                                    onClick={() => toggleSemester(semesterNumber)}
                                >
                                    <div className="card-body bg-primary text-white rounded-top">
                                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="border border-white rounded-2 px-3 py-2 fw-bold">
                                                    S{semesterNumber}
                                                </div>
                                                <div>
                                                    <h4 className="fw-bold mb-1">Semester {semesterNumber}</h4>
                                                    <div className="small opacity-75">
                                                        {courseCount} Courses <span className="mx-2">•</span> {electiveCount} Elective Groups
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="badge bg-light text-dark">Credits: {totals.credits}</span>
                                                <span className="badge bg-light text-dark">L-T-P: {totals.ltp}</span>
                                                <i className={`bi ${expanded ? "bi-chevron-up" : "bi-chevron-down"} fs-5`}></i>
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {expanded && (
                                    <div className="card-body border-top">
                                        <div className="mb-4">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <i className="bi bi-journal-bookmark text-primary fs-5"></i>
                                                <h5 className="fw-bold mb-0">Core / Normal Courses</h5>
                                            </div>
                                            {renderCourses(semesterData.courses, semesterNumber)}
                                        </div>

                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <i className="bi bi-collection text-warning fs-5"></i>
                                                <h5 className="fw-bold mb-0">Elective Groups</h5>
                                            </div>
                                            {renderElectives(semesterData.electives, semesterNumber)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                        <i className="bi bi-journal-text text-muted" style={{ fontSize: "50px" }}></i>
                        <h5 className="mt-3">View Complete Curriculum</h5>
                        <p className="text-muted mb-0">
                            Select a regulation and department, then click Load All to view all semesters.
                        </p>
                    </div>
                </div>
            )}

            {showElectiveModal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <div>
                                    <h5 className="modal-title fw-bold mb-1">Manage Elective Selection</h5>
                                    {selectedGroup && (
                                        <div className="small text-muted">
                                            {selectedGroup.name} • Semester {selectedGroup.semesterNumber}
                                        </div>
                                    )}
                                </div>
                                <button type="button" className="btn-close" onClick={handleCloseElectiveModal} disabled={savingElectives}></button>
                            </div>

                            <div className="modal-body">
                                {loadingSubjects ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary"></div>
                                        <p className="text-muted mt-3 mb-0">Loading elective subjects...</p>
                                    </div>
                                ) : electiveSubjects.length === 0 ? (
                                    <div className="alert alert-light border">No elective subjects found.</div>
                                ) : (
                                    <div className="list-group">
                                        {electiveSubjects.map((subject) => {
                                            const selected = selectedSubjectIds.includes(Number(subject.id));
                                            return (
                                                <label key={subject.id} className={`list-group-item list-group-item-action ${selected ? "bg-primary-subtle" : ""}`} style={{ cursor: "pointer" }}>
                                                    <div className="d-flex align-items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input mt-0"
                                                            checked={selected}
                                                            onChange={() => toggleSubject(subject.id)}
                                                        />
                                                        <div className="flex-grow-1">
                                                            <div className="fw-semibold">
                                                                {subject.courseCode || "—"} - {subject.courseName || "Unnamed Subject"}
                                                            </div>
                                                            <div className="small text-muted">
                                                                L-T-P: {getLTP(subject)} <span className="mx-2">•</span> Credits: {subject.credits ?? 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <span className="text-muted small me-auto">{selectedSubjectIds.length} selected</span>
                                <button type="button" className="btn btn-secondary" onClick={handleCloseElectiveModal} disabled={savingElectives}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveElectives} disabled={loadingSubjects || savingElectives}>
                                    {savingElectives ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : "Save Selections"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSyllabusModal && selectedSyllabusItem && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <div>
                                    <h5 className="modal-title fw-bold mb-1">Manage Syllabus</h5>
                                    <div className="small text-muted">
                                        {selectedSyllabusItem.courseCode || "—"} - {selectedSyllabusItem.courseName || "Unnamed Subject"}
                                    </div>
                                </div>
                                <button type="button" className="btn-close" onClick={closeSyllabusEditor} disabled={syllabusUploading || syllabusStatusUpdating}></button>
                            </div>

                            <div className="modal-body">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <span className={`badge ${getStatusClass(getSyllabusStatus(selectedSyllabusItem))}`}>
                                        {getStatusLabel(getSyllabusStatus(selectedSyllabusItem))}
                                    </span>
                                    {selectedSyllabusItem.fileName && (
                                        <span className="small text-muted">{selectedSyllabusItem.fileName}</span>
                                    )}
                                </div>

                                <label className="form-label fw-semibold">Upload / Replace Syllabus</label>
                                <input
                                    id="admin-syllabus-file"
                                    type="file"
                                    className="form-control"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleSyllabusFileChange}
                                    disabled={syllabusUploading || syllabusStatusUpdating}
                                />
                                <div className="form-text">Allowed: PDF, DOC, DOCX. Maximum size: 10 MB.</div>

                                <button type="button" className="btn btn-success mt-3" onClick={handleAdminSyllabusUpload} disabled={!selectedSyllabusFile || syllabusUploading || syllabusStatusUpdating}>
                                    {syllabusUploading ? <><span className="spinner-border spinner-border-sm me-2"></span>Uploading...</> : <><i className="bi bi-upload me-1"></i>Upload Syllabus</>}
                                </button>

                                <hr />

                                <label className="form-label fw-semibold">Admin Remarks / Rejection Reason</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={syllabusRemarks}
                                    onChange={(event) => setSyllabusRemarks(event.target.value)}
                                    placeholder="Enter remarks. A rejection reason is required when rejecting."
                                    disabled={syllabusUploading || syllabusStatusUpdating}
                                ></textarea>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeSyllabusEditor} disabled={syllabusUploading || syllabusStatusUpdating}>Close</button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => handleAdminSyllabusStatus("REJECTED")}
                                    disabled={!getSyllabusId(selectedSyllabusItem) || syllabusUploading || syllabusStatusUpdating || !["PENDING", "APPROVED"].includes(getSyllabusStatus(selectedSyllabusItem))}
                                >
                                    {syllabusStatusUpdating ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-x-circle me-1"></i>}
                                    Reject & Delete
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => handleAdminSyllabusStatus("APPROVED")}
                                    disabled={!getSyllabusId(selectedSyllabusItem) || syllabusUploading || syllabusStatusUpdating || !["PENDING", "APPROVED"].includes(getSyllabusStatus(selectedSyllabusItem))}
                                >
                                    {syllabusStatusUpdating ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-check-circle me-1"></i>}
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default CourseStructureView;