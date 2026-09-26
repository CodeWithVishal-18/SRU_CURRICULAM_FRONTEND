import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api";

export default function SyllabusAuditLogModal({ syllabusId, courseTitle, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/api/syllabi/${syllabusId}/logs`);
                setLogs(res.data || []);
            } catch (err) {
                toast.error("Failed to load audit logs");
            } finally {
                setLoading(false);
            }
        };
        if (syllabusId) fetchLogs();
    }, [syllabusId]);

    const getBadge = (type) => {
        if (type === "INITIAL_UPLOAD") return "bg-primary";
        if (type === "REVISION") return "bg-info text-dark";
        if (type === "APPROVED") return "bg-success";
        if (type === "REJECTED") return "bg-danger";
        return "bg-secondary";
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg rounded-4">
                    <div className="modal-header bg-dark text-white py-3 px-4">
                        <div>
                            <h5 className="modal-title fw-bold mb-0">Syllabus Audit & Revision Logs</h5>
                            <small className="opacity-75">{courseTitle}</small>
                        </div>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                        {loading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary"></div>
                                <p className="text-muted mt-2">Loading audit timeline...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="alert alert-light text-center">No logs recorded yet.</div>
                        ) : (
                            <div className="timeline position-relative ps-4 border-start border-2 border-primary-subtle">
                                {logs.map((log, idx) => (
                                    <div key={log.id || idx} className="mb-4 position-relative">
                                        <div
                                            className="position-absolute rounded-circle bg-primary"
                                            style={{ width: "12px", height: "12px", left: "-31px", top: "5px" }}
                                        ></div>
                                        <div className="card border-0 bg-light p-3 rounded-3 shadow-sm">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <div>
                                                    <span className={`badge ${getBadge(log.actionType)} me-2`}>
                                                        {log.actionType.replace("_", " ")}
                                                    </span>
                                                    {log.revisionNumber && (
                                                        <span className="badge bg-secondary-subtle text-secondary me-2">
                                                            Revision #{log.revisionNumber}
                                                        </span>
                                                    )}
                                                    <strong>{log.userName || log.userId}</strong>
                                                    <small className="text-muted ms-2">({log.userRole || "USER"})</small>
                                                </div>
                                                <small className="text-muted">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </small>
                                            </div>
                                            <p className="mb-0 text-secondary mt-1">{log.comment}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer bg-light py-2">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}