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

    // Structured Book objects: { title, author, edition, publisher, year }
    const [textbooks, setTextbooks] = useState([
        { title: "", author: "", edition: "", publisher: "", year: "" }
    ]);
    const [referenceBooks, setReferenceBooks] = useState([]);

    // Structured Online Resources: { platform: "", topic: "", url: "" }
    const [onlineResources, setOnlineResources] = useState([
        { platform: "", topic: "", url: "" }
    ]);

    // Helpers
    const countWords = (text = "") => {
        const trimmed = text.trim();
        return trimmed ? trimmed.split(/\s+/).length : 0;
    };

    const isValidUrl = (url = "") => {
        const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
        return pattern.test(url.trim());
    };

    const parseBookString = (raw) => {
        if (!raw) return { title: "", author: "", edition: "", publisher: "", year: "" };
        if (typeof raw === "object") return raw;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === "object") return parsed;
        } catch {}
        return { title: raw, author: "", edition: "", publisher: "", year: "" };
    };

    const parseResourceString = (raw) => {
        if (!raw) return { platform: "", topic: "", url: "" };
        if (typeof raw === "object") return raw;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === "object") return parsed;
        } catch {}
        return { platform: "Online Resource", topic: "", url: raw };
    };

    const formatBookCitation = (b) => {
        if (!b) return "";
        if (typeof b === "string") return b;
        const parts = [];
        if (b.author?.trim()) parts.push(b.author.trim());
        if (b.title?.trim()) parts.push(`“${b.title.trim()}”`);
        if (b.edition?.trim()) parts.push(b.edition.trim());
        if (b.publisher?.trim()) parts.push(b.publisher.trim());
        if (b.year?.trim()) parts.push(b.year.trim());
        return parts.join(", ");
    };

    const currentTheoryTopicsCount = useMemo(() => {
        return units.reduce((acc, u) => acc + (u.topics ? u.topics.length : 0), 0);
    }, [units]);

    const unitStartOffsets = useMemo(() => {
        const offsets = [];
        let runningCount = 0;
        units.forEach((u) => {
            offsets.push(runningCount);
            runningCount += (u.topics || []).length;
        });
        return offsets;
    }, [units]);

    const storedUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);
    const isRealAdmin = Boolean(isAdmin && storedUser?.role === "ADMIN");

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

                        if (parsed.textbooks?.length) {
                            setTextbooks(parsed.textbooks.map(parseBookString));
                        }
                        if (parsed.referenceBooks) {
                            setReferenceBooks(parsed.referenceBooks.map(parseBookString));
                        }
                        if (parsed.onlineResources?.length) {
                            setOnlineResources(parsed.onlineResources.map(parseResourceString));
                        }
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

    const handleAddUnit = () => {
        if (units.length >= 5) {
            toast.warning("Maximum 5 units allowed");
            return;
        }
        if (currentTheoryTopicsCount >= targetTheoryTopics) {
            toast.warning(`Maximum theory topics limit reached (${targetTheoryTopics})`);
            return;
        }
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

    // Strict Validation: Every marked (*) input is compulsory!
    const validate = () => {
        if (!courseType.trim()) {
            toast.error("Course Type is required");
            return false;
        }
        if (!prerequisite.trim()) {
            toast.error("Pre-requisite is required (enter 'NA' if none)");
            return false;
        }
        if (courseOutcomes.length < 3 || courseOutcomes.length > 5) {
            toast.error("Course Outcomes must be between 3 and 5");
            return false;
        }
        for (let i = 0; i < courseOutcomes.length; i++) {
            if (!courseOutcomes[i].trim()) {
                toast.error(`Course Outcome CO${i + 1} cannot be empty`);
                return false;
            }
        }

        // Theory Units Validation
        if (L > 0) {
            if (currentTheoryTopicsCount !== targetTheoryTopics) {
                toast.error(`Total theory sessions must be exactly ${targetTheoryTopics} (currently ${currentTheoryTopicsCount})`);
                return false;
            }
            for (let i = 0; i < units.length; i++) {
                if (!units[i].title.trim()) {
                    toast.error(`Unit ${i + 1} title is required`);
                    return false;
                }
                for (let j = 0; j < units[i].topics.length; j++) {
                    if (!units[i].topics[j].trim()) {
                        toast.error(`Session description in Unit ${i + 1} (Topic #${unitStartOffsets[i] + j + 1}) cannot be empty`);
                        return false;
                    }
                }
            }
        }

        // Recitation Topics Validation
        if (R > 0) {
            if (recitations.length !== targetRecitationTopics) {
                toast.error(`Recitation sessions must be exactly ${targetRecitationTopics} (currently ${recitations.length})`);
                return false;
            }
            for (let i = 0; i < recitations.length; i++) {
                if (!recitations[i].trim()) {
                    toast.error(`Recitation session #${i + 1} cannot be empty`);
                    return false;
                }
            }
        }

        // Lab Components Validation
        if (P > 0) {
            if (labComponents.length !== targetLabTopics) {
                toast.error(`Lab sessions must be exactly ${targetLabTopics} (currently ${labComponents.length})`);
                return false;
            }
            for (let i = 0; i < labComponents.length; i++) {
                if (!labComponents[i].trim()) {
                    toast.error(`Lab activity #${i + 1} cannot be empty`);
                    return false;
                }
            }
        }

        // Textbooks Validation: (Everything except edition is compulsory)
        if (textbooks.length === 0) {
            toast.error("Please add at least 1 Textbook");
            return false;
        }
        for (let i = 0; i < textbooks.length; i++) {
            const tb = textbooks[i];
            if (!tb.title?.trim()) {
                toast.error(`Textbook #${i + 1}: Book Title is required`);
                return false;
            }
            if (!tb.author?.trim()) {
                toast.error(`Textbook #${i + 1}: Author(s) is required`);
                return false;
            }
            if (!tb.publisher?.trim()) {
                toast.error(`Textbook #${i + 1}: Publisher is required`);
                return false;
            }
            if (!tb.year?.trim()) {
                toast.error(`Textbook #${i + 1}: Publication Year is required`);
                return false;
            }
        }

        // Reference Books Validation: (If added, all fields except edition are compulsory)
        for (let i = 0; i < referenceBooks.length; i++) {
            const rb = referenceBooks[i];
            if (!rb.title?.trim()) {
                toast.error(`Reference Book #${i + 1}: Book Title is required`);
                return false;
            }
            if (!rb.author?.trim()) {
                toast.error(`Reference Book #${i + 1}: Author(s) is required`);
                return false;
            }
            if (!rb.publisher?.trim()) {
                toast.error(`Reference Book #${i + 1}: Publisher is required`);
                return false;
            }
            if (!rb.year?.trim()) {
                toast.error(`Reference Book #${i + 1}: Publication Year is required`);
                return false;
            }
        }

        // Online Resources Validation: (Platform, Topic (max 30 words), and valid URL are mandatory)
        if (onlineResources.length > 3) {
            toast.error("Maximum 3 reference links allowed");
            return false;
        }
        for (let i = 0; i < onlineResources.length; i++) {
            const res = onlineResources[i];
            if (!res.platform?.trim()) {
                toast.error(`Reference Link #${i + 1}: Platform / Source is required (e.g., Coursera)`);
                return false;
            }
            if (!res.topic?.trim()) {
                toast.error(`Reference Link #${i + 1}: Topic description is required`);
                return false;
            }
            if (countWords(res.topic) > 30) {
                toast.error(`Reference Link #${i + 1}: Topic description exceeds 30 words`);
                return false;
            }
            if (!res.url?.trim()) {
                toast.error(`Reference Link #${i + 1}: Link / URL is required`);
                return false;
            }
            if (!isValidUrl(res.url)) {
                toast.error(`Reference Link #${i + 1}: Invalid URL format: "${res.url}".`);
                return false;
            }
        }

        return true;
    };

    const handleSave = async (isDraft = false) => {
        if (!isDraft && !validate()) return;

        const serializedTextbooks = textbooks
            .filter((b) => b.title?.trim())
            .map((b) => formatBookCitation(b));

        const serializedReferenceBooks = referenceBooks
            .filter((b) => b.title?.trim())
            .map((b) => formatBookCitation(b));

        const serializedOnlineResources = onlineResources
            .filter((r) => r.url?.trim())
            .map((r) =>
                JSON.stringify({
                    platform: r.platform?.trim() || "Online Resource",
                    topic: r.topic?.trim() || "",
                    url: r.url.trim(),
                })
            );

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
            textbooks: serializedTextbooks,
            referenceBooks: serializedReferenceBooks,
            onlineResources: serializedOnlineResources,
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

    const handleDownloadPdf = () => {
        const printWindow = window.open("", "_blank", "width=900,height=800");
        if (!printWindow) {
            toast.error("Please allow popups to download the PDF");
            return;
        }

        const validCOs = courseOutcomes.filter((co) => co.trim());
        const validRecs = recitations.filter((r) => r.trim());
        const validLabs = labComponents.filter((l) => l.trim());
        const validTbs = textbooks.map(formatBookCitation).filter(Boolean);
        const validRbs = referenceBooks.map(formatBookCitation).filter(Boolean);
        const validRes = onlineResources.filter((r) => r.url?.trim());

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
                    ol, ul { margin-top: 4px; margin-bottom: 12px; padding-left: 22px; }
                    li { margin-bottom: 4px; }
                </style>
            </head>
            <body>
                <div class="header-banner">
                    <h4>SR UNIVERSITY, WARANGAL</h4>
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
                    ${units.map((u, uIdx) => {
                        const startNum = unitStartOffsets[uIdx] || 0;
                        return `
                            <div style="margin-bottom: 10px;">
                                <div style="font-weight: bold;">${u.title}</div>
                                <ul style="margin: 0; padding-left: 20px; list-style-type: none;">
                                    ${(u.topics || []).map((top, tIdx) => `<li><strong>${startNum + tIdx + 1}.</strong> ${top}</li>`).join("")}
                                </ul>
                            </div>
                        `;
                    }).join("")}
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
                    <div class="section-title">Online Resources & Reference Links</div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 12px;">
                        <thead>
                            <tr style="background: #f1f5f9; text-align: left;">
                                <th style="border: 1px solid #333; padding: 5px 8px; width: 40px; text-align: center;">#</th>
                                <th style="border: 1px solid #333; padding: 5px 8px; width: 130px;">Platform</th>
                                <th style="border: 1px solid #333; padding: 5px 8px;">Topic</th>
                                <th style="border: 1px solid #333; padding: 5px 8px;">Resource Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${validRes.map((res, idx) => `
                                <tr>
                                    <td style="border: 1px solid #333; padding: 5px 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
                                    <td style="border: 1px solid #333; padding: 5px 8px; font-weight: 600; color: #0d6efd;">${res.platform || "Online"}</td>
                                    <td style="border: 1px solid #333; padding: 5px 8px;">${res.topic || "-"}</td>
                                    <td style="border: 1px solid #333; padding: 5px 8px;">
                                        <a href="${res.url.startsWith("http") ? res.url : `https://${res.url}`}">${res.url}</a>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
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
                                        {!isFaculty && !isRealAdmin && (
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

                                {/* VIEW MODE TABLE HEADER WITH LRPC */}
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
                                        {units.map((u, uIdx) => {
                                            const startNum = unitStartOffsets[uIdx] || 0;
                                            return (
                                                <div key={uIdx} className="mb-3 ps-2">
                                                    <div className="fw-bold text-primary mb-1">{u.title}</div>
                                                    <ul className="list-unstyled ps-3 mb-0">
                                                        {(u.topics || []).map((top, tIdx) => (
                                                            <li key={tIdx} className="text-secondary mb-1">
                                                                <strong className="text-dark me-1">{startNum + tIdx + 1}.</strong> {top}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })}
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
                                            <li key={bIdx} className="mb-1 text-secondary">
                                                {formatBookCitation(tb)}
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                {referenceBooks.some(b => b.title?.trim()) && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-dark border-bottom pb-2">Reference Books</h6>
                                        <ol className="ps-3 mb-0">
                                            {referenceBooks.filter(b => b.title?.trim()).map((rb, rIdx) => (
                                                <li key={rIdx} className="mb-1 text-secondary">
                                                    {formatBookCitation(rb)}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {onlineResources.some(r => r.url?.trim()) && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-dark border-bottom pb-2">
                                            <i className="bi bi-globe me-2 text-primary"></i> Reference Links & Online Resources
                                        </h6>
                                        <div className="row g-2">
                                            {onlineResources.filter(r => r.url?.trim()).map((res, oIdx) => (
                                                <div key={oIdx} className="col-12">
                                                    <div className="p-2.5 border rounded-3 bg-light d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                                <span className="badge bg-secondary-subtle text-secondary fw-semibold">
                                                                    #{oIdx + 1}
                                                                </span>
                                                                <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
                                                                    {res.platform || "Online Resource"}
                                                                </span>
                                                                {res.topic && (
                                                                    <strong className="text-dark small">
                                                                        {res.topic}
                                                                    </strong>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={res.url.startsWith("http") ? res.url : `https://${res.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm btn-outline-primary py-1 px-3 d-flex align-items-center gap-1 text-nowrap"
                                                        >
                                                            <span>Open Link</span>
                                                            <i className="bi bi-box-arrow-up-right small"></i>
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* UNIFIED DISCUSSION FEED */}
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
                                {/* TABLE HEADER WITH LRPC COLUMNS */}
                                <div className="border rounded-3 overflow-hidden shadow-sm mb-4 bg-white">
                                    <table className="table table-bordered mb-0 align-middle text-center">
                                        <tbody>
                                            <tr>
                                                <td colSpan="3" className="text-start p-3 bg-white">
                                                    <div className="text-primary fw-bold fs-5 mb-1">
                                                        {item.courseCode || "-"}
                                                    </div>
                                                    <div className="text-dark fw-bold fs-6">
                                                        {item.courseName}
                                                    </div>
                                                </td>
                                                <td style={{ width: "65px" }} className="fw-bold bg-white text-dark fs-6">L</td>
                                                <td style={{ width: "65px" }} className="fw-bold bg-white text-dark fs-6">R</td>
                                                <td style={{ width: "65px" }} className="fw-bold bg-white text-dark fs-6">P</td>
                                                <td style={{ width: "65px" }} className="fw-bold bg-white text-dark fs-6">C</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="3" className="text-start text-secondary px-3 py-2 bg-light-subtle">
                                                    Credit Structure
                                                </td>
                                                <td className="fw-bold bg-light-subtle text-dark fs-6">{L}</td>
                                                <td className="fw-bold bg-light-subtle text-dark fs-6">{R}</td>
                                                <td className="fw-bold bg-light-subtle text-dark fs-6">{P}</td>
                                                <td className="fw-bold bg-light-subtle text-dark fs-6">{C}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* COURSE TYPE & PRE-REQUISITE */}
                                    <div className="p-3 bg-light border-top">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold small mb-1">
                                                    Course Type <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={courseType}
                                                    onChange={(e) => setCourseType(e.target.value)}
                                                    placeholder="e.g. Engineering Science / Professional Core"
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-semibold small mb-1">
                                                    Pre-requisite <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={prerequisite}
                                                    onChange={(e) => setPrerequisite(e.target.value)}
                                                    placeholder="e.g. NA or course code"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* COURSE OUTCOMES */}
                                <div className="card border p-3 mb-4 rounded-3 shadow-sm">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="fw-bold mb-0 text-primary">
                                            Course Outcomes (Min 3, Max 5) <span className="text-danger">*</span>
                                        </h6>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            disabled={courseOutcomes.length >= 5}
                                            onClick={() => setCourseOutcomes([...courseOutcomes, ""])}
                                        >
                                            + Add Outcome
                                        </button>
                                    </div>
                                    {courseOutcomes.map((co, cIdx) => (
                                        <div key={cIdx} className="input-group mb-2">
                                            <span className="input-group-text fw-bold bg-light">CO{cIdx + 1} *</span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder={`Outcome statement for CO${cIdx + 1}...`}
                                                value={co}
                                                required
                                                onChange={(e) => {
                                                    const u = [...courseOutcomes];
                                                    u[cIdx] = e.target.value;
                                                    setCourseOutcomes(u);
                                                }}
                                            />
                                            {courseOutcomes.length > 3 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger"
                                                    onClick={() => setCourseOutcomes(courseOutcomes.filter((_, idx) => idx !== cIdx))}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* THEORY UNITS */}
                                {L > 0 ? (
                                    <div className="card border p-3 mb-4 rounded-3 shadow-sm">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                <h6 className="fw-bold mb-0 text-primary">
                                                    Unit-Wise Syllabus (Theory) <span className="text-danger">*</span>
                                                </h6>
                                                <small className="text-muted">
                                                    Total Sessions: <strong className={currentTheoryTopicsCount === targetTheoryTopics ? "text-success" : "text-danger"}>{currentTheoryTopicsCount} / {targetTheoryTopics}</strong> (Must equal L × 12) • Units: <strong>{units.length} / 5</strong>
                                                </small>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary"
                                                disabled={units.length >= 5 || currentTheoryTopicsCount >= targetTheoryTopics}
                                                onClick={handleAddUnit}
                                                title={units.length >= 5 ? "Maximum 5 units reached" : currentTheoryTopicsCount >= targetTheoryTopics ? "Target topics limit reached" : "Add Unit"}
                                            >
                                                + Add Unit
                                            </button>
                                        </div>

                                        {units.map((unit, uIdx) => {
                                            const startOffset = unitStartOffsets[uIdx] || 0;
                                            return (
                                                <div key={uIdx} className="border p-3 rounded mb-3 bg-light-subtle">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <div className="input-group me-2">
                                                            <span className="input-group-text fw-semibold small bg-white text-muted">
                                                                Unit {uIdx + 1} Title *
                                                            </span>
                                                            <input
                                                                type="text"
                                                                className="form-control fw-bold"
                                                                value={unit.title}
                                                                required
                                                                onChange={(e) => {
                                                                    const u = [...units];
                                                                    u[uIdx].title = e.target.value;
                                                                    setUnits(u);
                                                                }}
                                                                placeholder={`Unit ${uIdx + 1}: Title`}
                                                            />
                                                        </div>
                                                        <button type="button" className="btn btn-sm btn-outline-danger text-nowrap" onClick={() => handleRemoveUnit(uIdx)}>
                                                            Remove Unit
                                                        </button>
                                                    </div>

                                                    {(unit.topics || []).map((top, tIdx) => {
                                                        const sequentialTopicNumber = startOffset + tIdx + 1;
                                                        return (
                                                            <div key={tIdx} className="input-group mb-1">
                                                                <span className="input-group-text small fw-bold bg-light" style={{ minWidth: "45px", justifyContent: "center" }}>
                                                                    {sequentialTopicNumber} *
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    placeholder={`Session description for topic #${sequentialTopicNumber}...`}
                                                                    value={top}
                                                                    required
                                                                    onChange={(e) => {
                                                                        const u = [...units];
                                                                        u[uIdx].topics[tIdx] = e.target.value;
                                                                        setUnits(u);
                                                                    }}
                                                                />
                                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveTopicFromUnit(uIdx, tIdx)}>
                                                                    <i className="bi bi-x"></i>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}

                                                    <div className="mt-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-link text-decoration-none p-0"
                                                            disabled={currentTheoryTopicsCount >= targetTheoryTopics}
                                                            onClick={() => handleAddTopicToUnit(uIdx)}
                                                        >
                                                            + Add Topic to this Unit
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary small mb-4">Theory Section: Not Applicable (L = 0)</div>
                                )}

                                {/* RECITATION */}
                                {R > 0 ? (
                                    <div className="card border p-3 mb-4 rounded-3 shadow-sm">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                <h6 className="fw-bold mb-0 text-primary">
                                                    Recitation / Tutorial Topics <span className="text-danger">*</span>
                                                </h6>
                                                <small className="text-muted">
                                                    Sessions: <strong className={recitations.length === targetRecitationTopics ? "text-success" : "text-danger"}>{recitations.length} / {targetRecitationTopics}</strong> (Must equal R × 12)
                                                </small>
                                            </div>
                                            <button type="button" className="btn btn-sm btn-outline-primary" disabled={recitations.length >= targetRecitationTopics} onClick={() => setRecitations([...recitations, ""])}>+ Add Topic</button>
                                        </div>
                                        {recitations.map((rec, rIdx) => (
                                            <div key={rIdx} className="input-group mb-2">
                                                <span className="input-group-text small fw-bold">{rIdx + 1} *</span>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Recitation session description..."
                                                    value={rec}
                                                    required
                                                    onChange={(e) => {
                                                        const r = [...recitations];
                                                        r[rIdx] = e.target.value;
                                                        setRecitations(r);
                                                    }}
                                                />
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRecitations(recitations.filter((_, idx) => idx !== rIdx))}>
                                                    <i className="bi bi-x"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary small mb-4">Recitation Section: Not Applicable (R = 0)</div>
                                )}

                                {/* LAB */}
                                {P > 0 ? (
                                    <div className="card border p-3 mb-4 rounded-3 shadow-sm">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                <h6 className="fw-bold mb-0 text-primary">
                                                    Lab / Product Components <span className="text-danger">*</span>
                                                </h6>
                                                <small className="text-muted">
                                                    Sessions: <strong className={labComponents.length === targetLabTopics ? "text-success" : "text-danger"}>{labComponents.length} / {targetLabTopics}</strong> (Must equal (P/2) × 12)
                                                </small>
                                            </div>
                                            <button type="button" className="btn btn-sm btn-outline-primary" disabled={labComponents.length >= targetLabTopics} onClick={() => setLabComponents([...labComponents, ""])}>+ Add Component</button>
                                        </div>
                                        {labComponents.map((lab, lIdx) => (
                                            <div key={lIdx} className="input-group mb-2">
                                                <span className="input-group-text small fw-bold">{lIdx + 1} *</span>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Lab activity description..."
                                                    value={lab}
                                                    required
                                                    onChange={(e) => {
                                                        const l = [...labComponents];
                                                        l[lIdx] = e.target.value;
                                                        setLabComponents(l);
                                                    }}
                                                />
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setLabComponents(labComponents.filter((_, idx) => idx !== lIdx))}>
                                                    <i className="bi bi-x"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary small mb-4">Laboratory Section: Not Applicable (P = 0)</div>
                                )}

                                {/* TEXTBOOKS (EVERY INPUT EXCEPT EDITION IS COMPULSORY) */}
                                <div className="card border p-3 mb-4 rounded-3 shadow-sm">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <h6 className="fw-bold mb-0 text-primary">
                                                Textbooks (Maximum 2) <span className="text-danger">*</span>
                                            </h6>
                                            <small className="text-muted">All fields except Edition are compulsory.</small>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            disabled={textbooks.length >= 2}
                                            onClick={() => setTextbooks([...textbooks, { title: "", author: "", edition: "", publisher: "", year: "" }])}
                                        >
                                            + Add Textbook
                                        </button>
                                    </div>
                                    {textbooks.map((tb, idx) => (
                                        <div key={idx} className="border p-3 rounded mb-2 bg-light-subtle">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <strong className="text-secondary small">Textbook #{idx + 1}</strong>
                                                {textbooks.length > 1 && (
                                                    <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => setTextbooks(textbooks.filter((_, i) => i !== idx))}>
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div className="row g-2">
                                                <div className="col-md-6">
                                                    <label className="form-label small text-muted mb-0">
                                                        Book Title <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="e.g. Modern Operating Systems"
                                                        required
                                                        value={tb.title || ""}
                                                        onChange={(e) => {
                                                            const updated = [...textbooks];
                                                            updated[idx].title = e.target.value;
                                                            setTextbooks(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small text-muted mb-0">
                                                        Author(s) <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="e.g. Andrew S. Tanenbaum, Herbert Bos"
                                                        required
                                                        value={tb.author || ""}
                                                        onChange={(e) => {
                                                            const updated = [...textbooks];
                                                            updated[idx].author = e.target.value;
                                                            setTextbooks(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label small text-muted mb-0">
                                                        Edition <span className="text-muted">(Optional)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="e.g. 4th Edition"
                                                        value={tb.edition || ""}
                                                        onChange={(e) => {
                                                            const updated = [...textbooks];
                                                            updated[idx].edition = e.target.value;
                                                            setTextbooks(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-md-5">
                                                    <label className="form-label small text-muted mb-0">
                                                        Publisher <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="e.g. Pearson Education"
                                                        required
                                                        value={tb.publisher || ""}
                                                        onChange={(e) => {
                                                            const updated = [...textbooks];
                                                            updated[idx].publisher = e.target.value;
                                                            setTextbooks(updated);
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label small text-muted mb-0">
                                                        Year <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="e.g. 2015"
                                                        required
                                                        value={tb.year || ""}
                                                        onChange={(e) => {
                                                            const updated = [...textbooks];
                                                            updated[idx].year = e.target.value;
                                                            setTextbooks(updated);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* REFERENCE BOOKS (IF ADDED, EVERYTHING EXCEPT EDITION IS COMPULSORY) */}
                                <div className="card border p-3 mb-4 rounded-3 shadow-sm">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <h6 className="fw-bold mb-0 text-primary">Reference Books (Maximum 2)</h6>
                                            <small className="text-muted">Optional section. If added, all fields except Edition are compulsory.</small>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            disabled={referenceBooks.length >= 2}
                                            onClick={() => setReferenceBooks([...referenceBooks, { title: "", author: "", edition: "", publisher: "", year: "" }])}
                                        >
                                            + Add Reference Book
                                        </button>
                                    </div>
                                    {referenceBooks.length === 0 ? (
                                        <div className="text-muted small fst-italic p-2 bg-light rounded text-center">
                                            No reference books added. Click "+ Add Reference Book" if applicable.
                                        </div>
                                    ) : (
                                        referenceBooks.map((rb, idx) => (
                                            <div key={idx} className="border p-3 rounded mb-2 bg-light-subtle">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <strong className="text-secondary small">Reference Book #{idx + 1}</strong>
                                                    <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => setReferenceBooks(referenceBooks.filter((_, i) => i !== idx))}>
                                                        Remove
                                                    </button>
                                                </div>
                                                <div className="row g-2">
                                                    <div className="col-md-6">
                                                        <label className="form-label small text-muted mb-0">
                                                            Book Title <span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Title of reference book..."
                                                            required
                                                            value={rb.title || ""}
                                                            onChange={(e) => {
                                                                const updated = [...referenceBooks];
                                                                updated[idx].title = e.target.value;
                                                                setReferenceBooks(updated);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label small text-muted mb-0">
                                                            Author(s) <span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Author(s)..."
                                                            required
                                                            value={rb.author || ""}
                                                            onChange={(e) => {
                                                                const updated = [...referenceBooks];
                                                                updated[idx].author = e.target.value;
                                                                setReferenceBooks(updated);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label small text-muted mb-0">
                                                            Edition <span className="text-muted">(Optional)</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="e.g. 2nd Edition"
                                                            value={rb.edition || ""}
                                                            onChange={(e) => {
                                                                const updated = [...referenceBooks];
                                                                updated[idx].edition = e.target.value;
                                                                setReferenceBooks(updated);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="col-md-5">
                                                        <label className="form-label small text-muted mb-0">
                                                            Publisher <span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Publisher..."
                                                            required
                                                            value={rb.publisher || ""}
                                                            onChange={(e) => {
                                                                const updated = [...referenceBooks];
                                                                updated[idx].publisher = e.target.value;
                                                                setReferenceBooks(updated);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label small text-muted mb-0">
                                                            Year <span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="e.g. 2020"
                                                            required
                                                            value={rb.year || ""}
                                                            onChange={(e) => {
                                                                const updated = [...referenceBooks];
                                                                updated[idx].year = e.target.value;
                                                                setReferenceBooks(updated);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* REFERENCE LINKS / ONLINE RESOURCES (PLATFORM, TOPIC & LINK COMPULSORY) */}
                                <div className="card border p-3 mb-4 rounded-3 shadow-sm">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h6 className="fw-bold mb-0 text-primary">
                                                <i className="bi bi-link-45deg me-1"></i> Reference Links & Online Resources <span className="text-danger">*</span>
                                            </h6>
                                            <small className="text-muted">
                                                Add up to <strong>3</strong> links • Platform, Topic (Max 30 words), and verified URL are compulsory.
                                            </small>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            disabled={onlineResources.length >= 3}
                                            onClick={() => setOnlineResources([...onlineResources, { platform: "", topic: "", url: "" }])}
                                            title={onlineResources.length >= 3 ? "Maximum 3 links reached" : "Add Reference Link"}
                                        >
                                            <i className="bi bi-plus-lg me-1"></i> Add Link ({onlineResources.length}/3)
                                        </button>
                                    </div>

                                    {onlineResources.map((res, idx) => {
                                        const words = countWords(res.topic);
                                        const urlValid = res.url?.trim() ? isValidUrl(res.url) : null;

                                        return (
                                            <div key={idx} className="border rounded-3 p-3 mb-3 bg-light-subtle shadow-sm">
                                                <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                                    <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1">
                                                        Reference Link #{idx + 1}
                                                    </span>
                                                    {onlineResources.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger py-0 px-2"
                                                            onClick={() => setOnlineResources(onlineResources.filter((_, i) => i !== idx))}
                                                        >
                                                            <i className="bi bi-trash me-1"></i> Remove
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="row g-2 align-items-start">
                                                    <div className="col-md-3">
                                                        <label className="form-label small fw-semibold text-muted mb-1">
                                                            Platform / Source <span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="e.g. Coursera, Simplilearn, NPTEL"
                                                            required
                                                            value={res.platform || ""}
                                                            onChange={(e) => {
                                                                const updated = [...onlineResources];
                                                                updated[idx].platform = e.target.value;
                                                                setOnlineResources(updated);
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="col-md-5">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <label className="form-label small fw-semibold text-muted mb-0">
                                                                Topic Description <span className="text-danger">*</span>
                                                            </label>
                                                            <span className={`small ${words > 30 ? "text-danger fw-bold" : "text-muted"}`} style={{ fontSize: "0.75rem" }}>
                                                                {words} / 30 words
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className={`form-control form-control-sm ${words > 30 ? "is-invalid border-danger" : ""}`}
                                                            placeholder="Enter topic name (Max 30 words)..."
                                                            required
                                                            value={res.topic || ""}
                                                            onChange={(e) => {
                                                                const updated = [...onlineResources];
                                                                updated[idx].topic = e.target.value;
                                                                setOnlineResources(updated);
                                                            }}
                                                        />
                                                        {words > 30 && (
                                                            <small className="text-danger d-block mt-1" style={{ fontSize: "0.75rem" }}>
                                                                Topic exceeds the 30-word limit! Please shorten it.
                                                            </small>
                                                        )}
                                                    </div>

                                                    <div className="col-md-4">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <label className="form-label small fw-semibold text-muted mb-0">
                                                                Link / URL <span className="text-danger">*</span>
                                                            </label>
                                                            {urlValid !== null && (
                                                                <span className={`small fw-semibold ${urlValid ? "text-success" : "text-danger"}`} style={{ fontSize: "0.75rem" }}>
                                                                    {urlValid ? <><i className="bi bi-check-circle me-1"></i>Valid Link</> : <><i className="bi bi-x-circle me-1"></i>Invalid URL</>}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="url"
                                                            className={`form-control form-control-sm ${urlValid === false ? "is-invalid border-danger" : urlValid === true ? "is-valid border-success" : ""}`}
                                                            placeholder="https://www.coursera.org/..."
                                                            required
                                                            value={res.url || ""}
                                                            onChange={(e) => {
                                                                const updated = [...onlineResources];
                                                                updated[idx].url = e.target.value;
                                                                setOnlineResources(updated);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MODAL FOOTER */}
                    <div className="modal-footer d-flex justify-content-between bg-light py-2 px-4">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>

                        <div className="d-flex align-items-center gap-2">
                            {!isEditMode && isRealAdmin && (currentStatus === "UPLOADED" || currentStatus === "APPROVED") && (
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
                                                onClick={() => setShowRejectInput(false)}
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