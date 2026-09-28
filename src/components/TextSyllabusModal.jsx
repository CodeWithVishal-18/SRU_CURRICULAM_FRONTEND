import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import api from "../services/api";

export default function TextSyllabusModal({
    item,
    type,
    readOnly = false,
    isAdmin = false,
    isFaculty = false,
    programHeader = "",
    onClose,
    onSuccess,
}) {
    const isElective = type === "elective";
    const L = Number(item.lecture) || 0;
    const R = Number(item.tutorial) || 0;
    const P = Number(item.practical) || 0;
    const C = Number(item.credits) || 0;

    const targetTheoryTopics = L * 12;
    const targetRecitationTopics = R * 12;
    const targetLabTopics = Math.round((P / 2) * 12);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(!readOnly);

    // Rejection state
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectRemark, setRejectRemark] = useState("");
    const [currentStatus, setCurrentStatus] = useState(item.syllabusStatus || "NOT_UPLOADED");

    // Unified Discussion / Remarks state
    const [remarksList, setRemarksList] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const commentsEndRef = useRef(null);

    // Form fields
    const [courseType, setCourseType] = useState(item.category || "Engineering Science");
    const [prerequisite, setPrerequisite] = useState("NA");
    const [courseOutcomes, setCourseOutcomes] = useState(["", "", ""]);
    const [units, setUnits] = useState(L > 0 ? [{ title: "Unit 1: Introduction", topics: [""] }] : []);
    const [recitations, setRecitations] = useState(R > 0 ? [""] : []);
    const [labComponents, setLabComponents] = useState(P > 0 ? [""] : []);
    const [textbooks, setTextbooks] = useState([""]);
    const [referenceBooks, setReferenceBooks] = useState([""]);
    const [onlineResources, setOnlineResources] = useState([""]);

    const fetchRemarks = async (syllabusId) => {
        try {
            const res = await api.get(`/api/syllabi/${syllabusId}/remarks`);
            setRemarksList(res.data || []);
        } catch {
            console.warn("Could not load remarks");
        }
    };

    useEffect(() => {
        const loadSyllabus = async () => {
            const syllabusId = item.syllabusId;
            if (!syllabusId) return;

            try {
                setLoading(true);
                const [res, remarksRes] = await Promise.all([
                    api.get(`/api/syllabi/${syllabusId}`),
                    api.get(`/api/syllabi/${syllabusId}/remarks`).catch(() => ({ data: [] })),
                ]);

                const data = res.data?.data || res.data;
                setRemarksList(remarksRes.data || []);

                if (data) {
                    if (data.status) setCurrentStatus(data.status);
                    if (data.rejectionReason) setRejectionReason(data.rejectionReason);

                    if (data.syllabusData) {
                        const parsed = JSON.parse(data.syllabusData);
                        if (parsed.courseType) setCourseType(parsed.courseType);
                        if (parsed.prerequisite) setPrerequisite(parsed.prerequisite);
                        if (parsed.courseOutcomes?.length) setCourseOutcomes(parsed.courseOutcomes);
                        if (parsed.units) setUnits(parsed.units);
                        if (parsed.recitations) setRecitations(parsed.recitations);
                        if (parsed.labComponents) setLabComponents(parsed.labComponents);
                        if (parsed.textbooks) setTextbooks(parsed.textbooks);
                        if (parsed.referenceBooks) setReferenceBooks(parsed.referenceBooks);
                        if (parsed.onlineResources) setOnlineResources(parsed.onlineResources);
                    }
                }
            } catch (err) {
                console.error("Could not load syllabus text", err);
            } finally {
                setLoading(false);
            }
        };

        loadSyllabus();
    }, [item]);

    const currentTheoryTopicsCount = useMemo(() => {
        return units.reduce((acc, u) => acc + (u.topics ? u.topics.length : 0), 0);
    }, [units]);

    const handleAddUnit = () => {
        setUnits([...units, { title: `Unit ${units.length + 1}: `, topics: [""] }]);
    };

    const handleRemoveUnit = (uIdx) => {
        if (units.length <= 1) {
            toast.warning("At least one Unit is required");
            return;
        }
        setUnits(units.filter((_, idx) => idx !== uIdx));
    };

    const handleAddTopicToUnit = (uIdx) => {
        if (currentTheoryTopicsCount >= targetTheoryTopics) {
            toast.warning(`Maximum ${targetTheoryTopics} theory topics reached (${L} × 12)`);
            return;
        }
        const updated = [...units];
        updated[uIdx].topics.push("");
        setUnits(updated);
    };

    const handleRemoveTopicFromUnit = (uIdx, tIdx) => {
        const updated = [...units];
        if (updated[uIdx].topics.length <= 1 && units.length === 1) {
            toast.warning("Unit must contain at least one topic");
            return;
        }
        updated[uIdx].topics.splice(tIdx, 1);
        setUnits(updated);
    };

    // =========================================================
    // POST COMMENT / REMARK (ANY USER)
    // =========================================================
    const handlePostComment = async () => {
        if (!newComment.trim()) {
            toast.error("Please enter your comment or remark");
            return;
        }
        if (!item.syllabusId) {
            toast.error("Syllabus must be saved before adding comments");
            return;
        }

        try {
            setPostingComment(true);
            const res = await api.post(`/api/syllabi/${item.syllabusId}/remarks`, {
                remarkText: newComment.trim(),
            });
            toast.success("Comment added to discussion");
            setRemarksList((prev) => [...prev, res.data]);
            setNewComment("");
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to post comment");
        } finally {
            setPostingComment(false);
        }
    };

    // =========================================================
    // PRINT / DOWNLOAD AS PDF
    // =========================================================
    const handleDownloadPdf = () => {
        const printWindow = window.open("", "_blank", "width=900,height=800");
        if (!printWindow) {
            toast.error("Please allow popups to download the PDF");
            return;
        }

        const validCOs = courseOutcomes.filter((co) => co.trim());
        const validRecs = recitations.filter((r) => r.trim());
        const validLabs = labComponents.filter((l) => l.trim());
        const validTbs = textbooks.filter((t) => t.trim());
        const validRbs = referenceBooks.filter((r) => r.trim());
        const validRes = onlineResources.filter((r) => r.trim());

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${item.courseCode || "Course"}_${item.courseName || "Syllabus"}</title>
                <style>
                    @page { size: A4; margin: 18mm 16mm; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; line-height: 1.45; font-size: 11pt; margin: 0; padding: 0; }
                    .header-banner { text-align: center; border-bottom: 2px solid #0d6efd; padding-bottom: 8px; margin-bottom: 16px; }
                    .header-banner h4 { margin: 0 0 4px 0; font-size: 14pt; text-transform: uppercase; }
                    .header-banner h5 { margin: 0; font-size: 11pt; font-weight: 600; color: #0d6efd; }
                    table.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
                    table.meta-table td { border: 1px solid #333; padding: 6px 10px; font-size: 10.5pt; }
                    .section-title { font-size: 11.5pt; font-weight: bold; border-bottom: 1.5px solid #222; padding-bottom: 3px; margin-top: 16px; margin-bottom: 8px; text-transform: uppercase; }
                    ul, ol { margin-top: 4px; margin-bottom: 12px; padding-left: 22px; }
                    li { margin-bottom: 4px; }
                    .unit-block { margin-bottom: 10px; }
                    .unit-title { font-weight: bold; color: #000; margin-bottom: 3px; }
                </style>
            </head>
            <body>
                <div class="header-banner">
                    <h4>SR UNIVERSITY</h4>
                    ${programHeader ? `<h5>${programHeader}</h5>` : ""}
                </div>

                <table class="meta-table">
                    <tbody>
                        <tr>
                            <td colspan="3" style="font-size: 12pt; font-weight: bold;">
                                <div>${item.courseCode || ""}</div>
                                <div>${item.courseName || ""}</div>
                            </td>
                            <td style="width: 45px; text-align: center; font-weight: bold;">L</td>
                            <td style="width: 45px; text-align: center; font-weight: bold;">R</td>
                            <td style="width: 45px; text-align: center; font-weight: bold;">P</td>
                            <td style="width: 45px; text-align: center; font-weight: bold;">C</td>
                        </tr>
                        <tr>
                            <td colspan="3" style="color: #444; font-size: 10pt;">Credit Structure</td>
                            <td style="text-align: center; font-weight: bold;">${L}</td>
                            <td style="text-align: center; font-weight: bold;">${R}</td>
                            <td style="text-align: center; font-weight: bold;">${P}</td>
                            <td style="text-align: center; font-weight: bold;">${C}</td>
                        </tr>
                        <tr>
                            <td style="width: 140px; font-weight: bold; background: #f2f2f2;">Course type</td>
                            <td>${courseType || "Engineering Science"}</td>
                            <td style="width: 140px; font-weight: bold; background: #f2f2f2;">Pre-requisite</td>
                            <td colspan="4">${prerequisite || "NA"}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="section-title">Course Outcomes:</div>
                <ul style="list-style-type: none; padding-left: 0;">
                    ${validCOs.map((co, idx) => `<li style="margin-bottom: 6px;"><strong>CO${idx + 1}:</strong> ${co}</li>`).join("")}
                </ul>

                ${L > 0 ? `
                    <div class="section-title">Unit-Wise Syllabus</div>
                    ${units.map((u) => `
                        <div class="unit-block">
                            <div class="unit-title">${u.title}</div>
                            <ul style="margin: 0; padding-left: 18px;">
                                ${(u.topics || []).filter(t => t.trim()).map(top => `<li>${top}</li>`).join("")}
                            </ul>
                        </div>
                    `).join("")}
                ` : ""}

                ${R > 0 && validRecs.length > 0 ? `
                    <div class="section-title">Recitation / Tutorial Topics</div>
                    <ol>${validRecs.map((rec) => `<li>${rec}</li>`).join("")}</ol>
                ` : ""}

                ${P > 0 && validLabs.length > 0 ? `
                    <div class="section-title">Lab / Product Components</div>
                    <ol>${validLabs.map((lab) => `<li>${lab}</li>`).join("")}</ol>
                ` : ""}

                ${validTbs.length > 0 ? `
                    <div class="section-title">Textbooks</div>
                    <ol>${validTbs.map((tb) => `<li>${tb}</li>`).join("")}</ol>
                ` : ""}

                ${validRbs.length > 0 ? `
                    <div class="section-title">Reference Books</div>
                    <ol>${validRbs.map((rb) => `<li>${rb}</li>`).join("")}</ol>
                ` : ""}

                ${validRes.length > 0 ? `
                    <div class="section-title">Online Resources / Useful Links</div>
                    <ul>${validRes.map((res) => `<li><a href="${res.startsWith("http") ? res : `https://${res}`}">${res}</a></li>`).join("")}</ul>
                ` : ""}
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };

    const validate = () => {
        if (!courseType.trim()) {
            toast.error("Please enter Course Type");
            return false;
        }
        if (!prerequisite.trim()) {
            toast.error("Please enter Pre-requisite (or 'NA')");
            return false;
        }
        if (courseOutcomes.length < 3 || courseOutcomes.length > 5) {
            toast.error("Course outcomes must be between 3 and 5");
            return false;
        }
        for (let i = 0; i < courseOutcomes.length; i++) {
            if (!courseOutcomes[i].trim()) {
                toast.error(`Course Outcome CO${i + 1} cannot be empty`);
                return false;
            }
        }

        if (L > 0) {
            if (currentTheoryTopicsCount !== targetTheoryTopics) {
                toast.error(`Total theory topics must be exactly ${targetTheoryTopics} (currently ${currentTheoryTopicsCount})`);
                return false;
            }
            for (let i = 0; i < units.length; i++) {
                if (!units[i].title.trim()) {
                    toast.error(`Unit ${i + 1} title is required`);
                    return false;
                }
                for (let j = 0; j < units[i].topics.length; j++) {
                    if (!units[i].topics[j].trim()) {
                        toast.error(`Topic in Unit ${i + 1} cannot be empty`);
                        return false;
                    }
                }
            }
        }

        if (R > 0) {
            if (recitations.length !== targetRecitationTopics) {
                toast.error(`Recitation topics must be exactly ${targetRecitationTopics} (currently ${recitations.length})`);
                return false;
            }
            for (let i = 0; i < recitations.length; i++) {
                if (!recitations[i].trim()) {
                    toast.error(`Recitation topic #${i + 1} cannot be empty`);
                    return false;
                }
            }
        }

        if (P > 0) {
            if (labComponents.length !== targetLabTopics) {
                toast.error(`Lab/Product topics must be exactly ${targetLabTopics} (currently ${labComponents.length})`);
                return false;
            }
            for (let i = 0; i < labComponents.length; i++) {
                if (!labComponents[i].trim()) {
                    toast.error(`Lab component #${i + 1} cannot be empty`);
                    return false;
                }
            }
        }

        const validTb = textbooks.filter((t) => t.trim());
        if (validTb.length === 0) {
            toast.error("Please add at least 1 Textbook");
            return false;
        }

        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
        const validRes = onlineResources.filter((r) => r.trim());
        for (const res of validRes) {
            if (!urlRegex.test(res.trim())) {
                toast.error(`Invalid URL format: "${res}"`);
                return false;
            }
        }

        return true;
    };

    const handleSave = async (isDraft = false) => {
        if (!isDraft && !validate()) return;

        const payload = {
            courseId: !isElective ? item.id : null,
            electiveSubjectId: isElective ? item.id : null,
            isDraft,
            courseType: courseType.trim(),
            prerequisite: prerequisite.trim(),
            courseOutcomes: courseOutcomes.filter((co) => co.trim()),
            units: units,
            recitations: recitations.filter((r) => r.trim()),
            labComponents: labComponents.filter((l) => l.trim()),
            textbooks: textbooks.filter((t) => t.trim()),
            referenceBooks: referenceBooks.filter((r) => r.trim()),
            onlineResources: onlineResources.filter((r) => r.trim()),
        };

        try {
            setSubmitting(true);
            const res = await api.post("/api/syllabi/text", payload);
            toast.success(isDraft ? "Draft saved successfully" : "Syllabus submitted and updated across all departments");
            if (onSuccess) onSuccess(res.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save syllabus");
        } finally {
            setSubmitting(false);
        }
    };

    // =========================================================
    // ADMIN ONLY REVIEW ACTIONS (APPROVE & REJECT)
    // =========================================================
    const handleAdminReview = async (status) => {
        if (!item.syllabusId) return;

        if (status === "REJECTED" && !rejectRemark.trim()) {
            toast.error("Please enter a rejection remark");
            return;
        }

        try {
            setSubmitting(true);
            await api.put(`/api/syllabi/${item.syllabusId}/status`, {
                status,
                rejectionReason: status === "REJECTED" ? rejectRemark.trim() : null,
            });
            toast.success(status === "APPROVED" ? "Syllabus Approved across all departments" : "Syllabus Rejected with remarks");
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update review status");
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadge = (role) => {
        if (role === "ADMIN") return "bg-danger";
        if (role === "HOD" || role === "DEAN") return "bg-primary";
        return "bg-secondary";
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-xl">
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header bg-primary text-white py-3 px-4 d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="modal-title fw-bold mb-0">
                                {!isEditMode ? "View Course Syllabus" : "Upload / Edit Syllabus"}
                            </h5>
                            <small className="opacity-75">{item.courseCode || ""} - {item.courseName}</small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            {!isEditMode && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-light fw-semibold text-primary d-flex align-items-center gap-1 shadow-sm"
                                    onClick={handleDownloadPdf}
                                    title="Download as PDF"
                                >
                                    <i className="bi bi-file-earmark-pdf-fill fs-6 text-danger"></i>
                                    <span>Download PDF</span>
                                </button>
                            )}
                            <button type="button" className="btn-close btn-close-white ms-2" onClick={onClose}></button>
                        </div>
                    </div>

                    <div className="modal-body p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary"></div>
                                <p className="text-muted mt-2">Loading syllabus...</p>
                            </div>
                        ) : !isEditMode ? (
                            /* READ ONLY VIEW MODE */
                            <div className="bg-white p-4 border rounded shadow-sm">
                                {programHeader && (
                                    <div className="text-center border-bottom pb-2 mb-4">
                                        <h5 className="fw-bold mb-0 text-primary">{programHeader}</h5>
                                    </div>
                                )}

                                {/* REJECTION BANNER: HOD/DEAN can edit & re-upload, Admin can also inspect */}
                                {currentStatus === "REJECTED" && (
                                    <div className="alert alert-danger border-0 d-flex justify-content-between align-items-center mb-4 p-3 rounded-3">
                                        <div>
                                            <div className="fw-bold fs-6">
                                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                                Syllabus Rejected by Admin
                                            </div>
                                            <div className="mt-1 small">
                                                <strong>Remark: </strong> {rejectionReason || "Please revise and upload another version."}
                                            </div>
                                        </div>
                                        {!isFaculty && !isAdmin && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger px-3 text-nowrap"
                                                onClick={() => setIsEditMode(true)}
                                            >
                                                <i className="bi bi-pencil-square me-1"></i> Edit & Re-Upload
                                            </button>
                                        )}
                                    </div>
                                )}

                                <table className="table table-bordered text-center align-middle mb-4">
                                    <tbody>
                                        <tr className="fw-bold">
                                            <td colSpan="3" className="text-start fs-5 p-3">
                                                <div className="text-primary">{item.courseCode}</div>
                                                <div className="text-dark">{item.courseName}</div>
                                            </td>
                                            <td style={{ width: "60px" }}>L</td>
                                            <td style={{ width: "60px" }}>R</td>
                                            <td style={{ width: "60px" }}>P</td>
                                            <td style={{ width: "60px" }}>C</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="3" className="text-start text-muted p-2">Credit Structure</td>
                                            <td className="fw-bold">{L}</td>
                                            <td className="fw-bold">{R}</td>
                                            <td className="fw-bold">{P}</td>
                                            <td className="fw-bold">{C}</td>
                                        </tr>
                                        <tr>
                                            <td className="fw-bold bg-light" style={{ width: "140px" }}>Course type</td>
                                            <td className="text-start">{courseType}</td>
                                            <td className="fw-bold bg-light" style={{ width: "140px" }}>Pre-requisite</td>
                                            <td colSpan="4" className="text-start">{prerequisite}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="mb-4">
                                    <h6 className="fw-bold text-dark border-bottom pb-2">Course Outcomes:</h6>
                                    <ul className="list-unstyled ps-2 mb-0">
                                        {courseOutcomes.map((co, idx) => (
                                            <li key={idx} className="mb-2"><strong>CO{idx + 1}:</strong> {co}</li>
                                        ))}
                                    </ul>
                                </div>

                                {L > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-dark border-bottom pb-2">Unit-Wise Syllabus</h6>
                                        {units.map((u, uIdx) => (
                                            <div key={uIdx} className="mb-3 ps-2">
                                                <div className="fw-bold text-primary mb-1">{u.title}</div>
                                                <ul className="list-unstyled ps-3 mb-0">
                                                    {u.topics.map((top, tIdx) => (
                                                        <li key={tIdx} className="text-secondary mb-1">• {top}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {R > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-dark border-bottom pb-2">Recitation / Tutorial Topics</h6>
                                        <ol className="ps-3 mb-0">
                                            {recitations.map((rec, rIdx) => (
                                                <li key={rIdx} className="mb-1 text-secondary">{rec}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {P > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-dark border-bottom pb-2">Lab / Product Components</h6>
                                        <ol className="ps-3 mb-0">
                                            {labComponents.map((lab, lIdx) => (
                                                <li key={lIdx} className="mb-1 text-secondary">{lab}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <h6 className="fw-bold text-dark border-bottom pb-2">Textbooks</h6>
                                    <ol className="ps-3 mb-0">
                                        {textbooks.map((tb, bIdx) => (
                                            <li key={bIdx} className="mb-1 text-secondary">{tb}</li>
                                        ))}
                                    </ol>
                                </div>

                                {referenceBooks.length > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-dark border-bottom pb-2">Reference Books</h6>
                                        <ol className="ps-3 mb-0">
                                            {referenceBooks.map((rb, rIdx) => (
                                                <li key={rIdx} className="mb-1 text-secondary">{rb}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {onlineResources.length > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-dark border-bottom pb-2">Online Resources / Useful Links</h6>
                                        <ul className="list-unstyled ps-3 mb-0">
                                            {onlineResources.map((res, oIdx) => (
                                                <li key={oIdx} className="mb-1">
                                                    <a href={res.startsWith("http") ? res : `https://${res}`} target="_blank" rel="noopener noreferrer">
                                                        {res}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* UNIFIED DISCUSSION & REMARKS FEED (SHARED ACROSS ALL ROLES) */}
                                <div className="border rounded-3 p-3 mt-4 bg-light shadow-sm">
                                    <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                                        <h6 className="fw-bold text-primary mb-0">
                                            <i className="bi bi-chat-left-text-fill me-2"></i>
                                            Discussion & Remarks Feed ({remarksList.length})
                                        </h6>
                                        <small className="text-muted">
                                            Shared across all departments teaching <strong>{item.courseCode}</strong>
                                        </small>
                                    </div>

                                    {/* Comments Stream */}
                                    <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: "250px", overflowY: "auto" }}>
                                        {remarksList.length === 0 ? (
                                            <p className="text-muted small mb-0 py-2 text-center fst-italic">
                                                No remarks or suggestions posted yet. Start the discussion below.
                                            </p>
                                        ) : (
                                            remarksList.map((rem) => (
                                                <div key={rem.id} className="card border-0 bg-white p-2.5 shadow-sm">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <strong className="text-dark small">{rem.facultyName || rem.employeeId}</strong>
                                                            <span className={`badge ${getRoleBadge(rem.userRole)}`} style={{ fontSize: "0.68rem" }}>
                                                                {rem.userRole || "USER"}
                                                            </span>
                                                            {rem.departmentCode && (
                                                                <span className="badge bg-light text-secondary border" style={{ fontSize: "0.68rem" }}>
                                                                    {rem.departmentCode}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                            {new Date(rem.createdAt).toLocaleString()}
                                                        </small>
                                                    </div>
                                                    <p className="mb-0 text-secondary small ps-1" style={{ whiteSpace: "pre-wrap" }}>
                                                        {rem.remarkText}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                        <div ref={commentsEndRef} />
                                    </div>

                                    {/* Add Comment Box */}
                                    <div className="input-group">
                                        <textarea
                                            className="form-control form-control-sm"
                                            rows="2"
                                            placeholder="Write a comment, feedback, or suggestion for this syllabus..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                        ></textarea>
                                        <button
                                            className="btn btn-primary btn-sm px-3 d-flex align-items-center gap-1"
                                            type="button"
                                            disabled={postingComment}
                                            onClick={handlePostComment}
                                        >
                                            {postingComment ? (
                                                <span className="spinner-border spinner-border-sm"></span>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send-fill"></i>
                                                    <span>Post</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* EDITING / UPLOAD FORM */
                            <div>
                                <div className="card bg-light border p-3 mb-4 rounded-3">
                                    <div className="row g-3 align-items-center">
                                        <div className="col-md-3">
                                            <label className="text-muted small d-block">Course Code</label>
                                            <span className="fw-bold fs-6">{item.courseCode || "-"}</span>
                                        </div>
                                        <div className="col-md-5">
                                            <label className="text-muted small d-block">Course Name</label>
                                            <span className="fw-bold fs-6">{item.courseName}</span>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="text-muted small d-block">L - R - P - C</label>
                                            <span className="badge bg-primary fs-6 me-2">{L} - {R} - {P} - {C}</span>
                                            <span className="badge bg-secondary-subtle text-secondary fs-6">{item.category || "CORE"}</span>
                                        </div>
                                    </div>
                                    <hr className="my-2" />
                                    <div className="row g-3 mt-1">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold small">Course Type *</label>
                                            <input type="text" className="form-control" value={courseType} onChange={(e) => setCourseType(e.target.value)} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold small">Pre-requisite *</label>
                                            <input type="text" className="form-control" value={prerequisite} onChange={(e) => setPrerequisite(e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="card border p-3 mb-4 rounded-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="fw-bold mb-0 text-primary">Course Outcomes (Min 3, Max 5)</h6>
                                        <button type="button" className="btn btn-sm btn-outline-primary" disabled={courseOutcomes.length >= 5} onClick={() => setCourseOutcomes([...courseOutcomes, ""])}>+ Add Outcome</button>
                                    </div>
                                    {courseOutcomes.map((co, cIdx) => (
                                        <div key={cIdx} className="input-group mb-2">
                                            <span className="input-group-text fw-bold bg-light">CO{cIdx + 1}</span>
                                            <input type="text" className="form-control" placeholder={`Outcome statement for CO${cIdx + 1}...`} value={co} onChange={(e) => {
                                                const u = [...courseOutcomes]; u[cIdx] = e.target.value; setCourseOutcomes(u);
                                            }} />
                                            {courseOutcomes.length > 3 && (
                                                <button type="button" className="btn btn-outline-danger" onClick={() => setCourseOutcomes(courseOutcomes.filter((_, idx) => idx !== cIdx))}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {L > 0 ? (
                                    <div className="card border p-3 mb-4 rounded-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                <h6 className="fw-bold mb-0 text-primary">Unit-Wise Syllabus (Theory)</h6>
                                                <small className="text-muted">
                                                    Total Topics: <strong className={currentTheoryTopicsCount === targetTheoryTopics ? "text-success" : "text-danger"}>{currentTheoryTopicsCount} / {targetTheoryTopics}</strong> (Must equal L × 12)
                                                </small>
                                            </div>
                                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAddUnit}>+ Add Unit</button>
                                        </div>

                                        {units.map((unit, uIdx) => (
                                            <div key={uIdx} className="border p-3 rounded mb-3 bg-light-subtle">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <input type="text" className="form-control fw-bold me-2" value={unit.title} onChange={(e) => {
                                                        const u = [...units]; u[uIdx].title = e.target.value; setUnits(u);
                                                    }} placeholder={`Unit ${uIdx + 1}: Title`} />
                                                    <button type="button" className="btn btn-sm btn-outline-danger text-nowrap" onClick={() => handleRemoveUnit(uIdx)}>Remove Unit</button>
                                                </div>

                                                {(unit.topics || []).map((top, tIdx) => (
                                                    <div key={tIdx} className="input-group mb-1">
                                                        <span className="input-group-text small">{tIdx + 1}</span>
                                                        <input type="text" className="form-control form-control-sm" placeholder="Topic description..." value={top} onChange={(e) => {
                                                            const u = [...units]; u[uIdx].topics[tIdx] = e.target.value; setUnits(u);
                                                        }} />
                                                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveTopicFromUnit(uIdx, tIdx)}>
                                                            <i className="bi bi-x"></i>
                                                        </button>
                                                    </div>
                                                ))}

                                                <div className="mt-2">
                                                    <button type="button" className="btn btn-sm btn-link text-decoration-none p-0" disabled={currentTheoryTopicsCount >= targetTheoryTopics} onClick={() => handleAddTopicToUnit(uIdx)}>
                                                        + Add Topic to this Unit
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary small mb-4">Theory Section: Not Applicable (L = 0)</div>
                                )}

                                {R > 0 ? (
                                    <div className="card border p-3 mb-4 rounded-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                <h6 className="fw-bold mb-0 text-primary">Recitation / Tutorial Topics</h6>
                                                <small className="text-muted">
                                                    Topics: <strong className={recitations.length === targetRecitationTopics ? "text-success" : "text-danger"}>{recitations.length} / {targetRecitationTopics}</strong> (Must equal R × 12)
                                                </small>
                                            </div>
                                            <button type="button" className="btn btn-sm btn-outline-primary" disabled={recitations.length >= targetRecitationTopics} onClick={() => setRecitations([...recitations, ""])}>+ Add Topic</button>
                                        </div>
                                        {recitations.map((rec, rIdx) => (
                                            <div key={rIdx} className="input-group mb-2">
                                                <span className="input-group-text small">{rIdx + 1}</span>
                                                <input type="text" className="form-control form-control-sm" placeholder="Recitation topic..." value={rec} onChange={(e) => {
                                                    const r = [...recitations]; r[rIdx] = e.target.value; setRecitations(r);
                                                }} />
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRecitations(recitations.filter((_, idx) => idx !== rIdx))}>
                                                    <i className="bi bi-x"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary small mb-4">Recitation Section: Not Applicable (R = 0)</div>
                                )}

                                {P > 0 ? (
                                    <div className="card border p-3 mb-4 rounded-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                <h6 className="fw-bold mb-0 text-primary">Lab / Product Components</h6>
                                                <small className="text-muted">
                                                    Topics: <strong className={labComponents.length === targetLabTopics ? "text-success" : "text-danger"}>{labComponents.length} / {targetLabTopics}</strong> (Must equal (P/2) × 12)
                                                </small>
                                            </div>
                                            <button type="button" className="btn btn-sm btn-outline-primary" disabled={labComponents.length >= targetLabTopics} onClick={() => setLabComponents([...labComponents, ""])}>+ Add Component</button>
                                        </div>
                                        {labComponents.map((lab, lIdx) => (
                                            <div key={lIdx} className="input-group mb-2">
                                                <span className="input-group-text small">{lIdx + 1}</span>
                                                <input type="text" className="form-control form-control-sm" placeholder="Lab activity..." value={lab} onChange={(e) => {
                                                    const l = [...labComponents]; l[lIdx] = e.target.value; setLabComponents(l);
                                                }} />
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setLabComponents(labComponents.filter((_, idx) => idx !== lIdx))}>
                                                    <i className="bi bi-x"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary small mb-4">Laboratory Section: Not Applicable (P = 0)</div>
                                )}

                                <div className="card border p-3 mb-4 rounded-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="fw-bold mb-0 text-primary">Textbooks (Maximum 2)</h6>
                                        <button type="button" className="btn btn-sm btn-outline-primary" disabled={textbooks.length >= 2} onClick={() => setTextbooks([...textbooks, ""])}>+ Add Textbook</button>
                                    </div>
                                    {textbooks.map((tb, idx) => (
                                        <div key={idx} className="input-group mb-2">
                                            <span className="input-group-text small">#{idx + 1}</span>
                                            <input type="text" className="form-control form-control-sm" placeholder="Author, “Book Title”, Edition, Publisher, Year." value={tb} onChange={(e) => {
                                                const t = [...textbooks]; t[idx] = e.target.value; setTextbooks(t);
                                            }} />
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setTextbooks(textbooks.filter((_, i) => i !== idx))}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="card border p-3 mb-4 rounded-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="fw-bold mb-0 text-primary">Reference Books (Maximum 2)</h6>
                                        <button type="button" className="btn btn-sm btn-outline-primary" disabled={referenceBooks.length >= 2} onClick={() => setReferenceBooks([...referenceBooks, ""])}>+ Add Reference Book</button>
                                    </div>
                                    {referenceBooks.map((rb, idx) => (
                                        <div key={idx} className="input-group mb-2">
                                            <span className="input-group-text small">#{idx + 1}</span>
                                            <input type="text" className="form-control form-control-sm" placeholder="Author, “Book Title”, Edition, Publisher, Year." value={rb} onChange={(e) => {
                                                const r = [...referenceBooks]; r[idx] = e.target.value; setReferenceBooks(r);
                                            }} />
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setReferenceBooks(referenceBooks.filter((_, i) => i !== idx))}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="card border p-3 mb-3 rounded-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="fw-bold mb-0 text-primary">Online Resources (Maximum 3)</h6>
                                        <button type="button" className="btn btn-sm btn-outline-primary" disabled={onlineResources.length >= 3} onClick={() => setOnlineResources([...onlineResources, ""])}>+ Add Resource</button>
                                    </div>
                                    {onlineResources.map((res, idx) => (
                                        <div key={idx} className="input-group mb-2">
                                            <span className="input-group-text small">#{idx + 1}</span>
                                            <input type="url" className="form-control form-control-sm" placeholder="https://..." value={res} onChange={(e) => {
                                                const o = [...onlineResources]; o[idx] = e.target.value; setOnlineResources(o);
                                            }} />
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setOnlineResources(onlineResources.filter((_, i) => i !== idx))}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="modal-footer d-flex justify-content-between bg-light py-2 px-4">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>

                        <div className="d-flex align-items-center gap-2">
                            {/* STRICTLY ADMIN-ONLY REVIEW ACTIONS */}
                            {!isEditMode && isAdmin && (currentStatus === "UPLOADED" || currentStatus === "APPROVED") && (
                                <>
                                    {showRejectInput ? (
                                        <div className="d-flex gap-2 align-items-center">
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="Rejection remark (mandatory)..."
                                                value={rejectRemark}
                                                onChange={(e) => setRejectRemark(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger text-nowrap"
                                                disabled={submitting}
                                                onClick={() => handleAdminReview("REJECTED")}
                                            >
                                                Confirm Reject
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light"
                                                onClick={() => {
                                                    setShowRejectInput(false);
                                                    setRejectRemark("");
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => setShowRejectInput(true)}
                                            >
                                                <i className="bi bi-x-circle me-1"></i>
                                                {currentStatus === "APPROVED" ? "Reject (Revoke Approval)" : "Reject with Remark"}
                                            </button>
                                            {currentStatus !== "APPROVED" && (
                                                <button
                                                    type="button"
                                                    className="btn btn-success btn-sm px-3"
                                                    disabled={submitting}
                                                    onClick={() => handleAdminReview("APPROVED")}
                                                >
                                                    <i className="bi bi-check-circle me-1"></i>
                                                    Approve Syllabus
                                                </button>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {/* EDIT MODE SUBMIT / DRAFT BUTTONS */}
                            {isEditMode && (
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-warning btn-sm"
                                        disabled={submitting}
                                        onClick={() => handleSave(true)}
                                    >
                                        Save Draft
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm px-4"
                                        disabled={submitting}
                                        onClick={() => handleSave(false)}
                                    >
                                        {submitting ? "Submitting..." : "Submit Syllabus"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}