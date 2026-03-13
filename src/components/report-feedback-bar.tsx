"use client";

import { useState } from "react";

interface ReportFeedbackBarProps {
  reportSlug: string;
}

function ThumbUpIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 10V21H5.5C4.67 21 4 20.33 4 19.5V11.5C4 10.67 4.67 10 5.5 10H9ZM20 11C20 10.45 19.55 10 19 10H14.31L15 6.73V6.5C15 5.67 14.33 5 13.5 5C13.08 5 12.7 5.17 12.43 5.45L8.71 9.17C8.27 9.61 8 10.22 8 10.86V19C8 20.1 8.9 21 10 21H17.31C18.11 21 18.84 20.52 19.16 19.78L21 14.5V13C21 11.9 20.1 11 19 11H20Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M15 3V14H18.5C19.33 14 20 13.33 20 12.5V4.5C20 3.67 19.33 3 18.5 3H15ZM4 13C4 13.55 4.45 14 5 14H9.69L9 17.27V17.5C9 18.33 9.67 19 10.5 19C10.92 19 11.3 18.83 11.57 18.55L15.29 14.83C15.73 14.39 16 13.78 16 13.14V5C16 3.9 15.1 3 14 3H6.69C5.89 3 5.16 3.48 4.84 4.22L3 9.5V11C3 12.1 3.9 13 5 13H4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ReportFeedbackBar({ reportSlug }: ReportFeedbackBarProps) {
  const [mode, setMode] = useState<"idle" | "liked" | "unliked" | "error">("idle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submitFeedback(reaction: "LIKE" | "UNLIKE", feedbackReason?: string) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/reports/${reportSlug}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reaction,
          reason: feedbackReason
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Unable to save feedback.");
      }

      setMode(reaction === "LIKE" ? "liked" : "unliked");
      setDialogOpen(false);
      setReason("");
    } catch (error) {
      setMode("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save feedback."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="report-feedback-bar" aria-label="Report feedback">
        <span className="report-feedback-label">Was this AI report helpful?</span>
        <div className="report-feedback-actions">
          <button
            className={`feedback-icon-button ${mode === "liked" ? "feedback-icon-button-active" : ""}`}
            disabled={isSubmitting}
            onClick={() => void submitFeedback("LIKE")}
            type="button"
          >
            <ThumbUpIcon />
          </button>
          <button
            className={`feedback-icon-button ${mode === "unliked" ? "feedback-icon-button-active" : ""}`}
            disabled={isSubmitting}
            onClick={() => {
              setDialogOpen(true);
              setErrorMessage("");
            }}
            type="button"
          >
            <ThumbDownIcon />
          </button>
        </div>
        {mode === "liked" ? <span className="report-feedback-status">Thanks for the feedback.</span> : null}
        {mode === "unliked" ? (
          <span className="report-feedback-status">Your feedback was saved.</span>
        ) : null}
        {mode === "error" && errorMessage ? (
          <span className="report-feedback-error">{errorMessage}</span>
        ) : null}
      </div>

      {dialogOpen ? (
        <div className="feedback-dialog-backdrop" role="presentation">
          <div
            aria-labelledby="feedback-dialog-title"
            aria-modal="true"
            className="feedback-dialog"
            role="dialog"
          >
            <h2 id="feedback-dialog-title">Tell us what was wrong</h2>
            <p className="muted-copy">
              Your note will help improve future AI-generated reports.
            </p>
            <textarea
              className="feedback-textarea"
              onChange={(event) => setReason(event.target.value)}
              placeholder="What did you dislike about this report?"
              rows={5}
              value={reason}
            />
            {errorMessage ? <p className="report-feedback-error">{errorMessage}</p> : null}
            <div className="feedback-dialog-actions">
              <button
                className="button-link button-link-secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setDialogOpen(false);
                  setReason("");
                  setErrorMessage("");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button-link"
                disabled={isSubmitting || reason.trim().length === 0}
                onClick={() => void submitFeedback("UNLIKE", reason)}
                type="button"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
