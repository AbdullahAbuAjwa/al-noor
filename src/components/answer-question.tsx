"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";

type Labels = {
  heading: string;
  points: string;
  save: string;
  clear: string;
  saving: string;
  saved: string;
  cleared: string;
  failed: string;
  retry: string;
};

type Status = "idle" | "saving" | "saved" | "cleared" | "failed";

const noSubscription = () => () => {};
// A pending value: an option id, null for "clear", undefined for nothing.
type Pending = string | null | undefined;

// One question of an attempt. Without JavaScript it is an ordinary form that
// posts and returns to the page. With JavaScript, choosing an option saves it
// at once. Saves for this question are sent one at a time and only the latest
// choice is sent next, so a slow earlier request cannot overwrite a newer
// answer. Only the server's acknowledgment is shown as "saved" (D08).
export function AnswerQuestion({
  action,
  questionId,
  position,
  text,
  options,
  savedOptionId,
  labels,
}: {
  action: string;
  questionId: string;
  position: number;
  text: string;
  options: { id: string; text: string }[];
  savedOptionId: string | null;
  labels: Labels;
}) {
  const [selected, setSelected] = useState<string | null>(savedOptionId);
  const [status, setStatus] = useState<Status>("idle");
  // False in the server HTML, true once the page's script is running.
  const enhanced = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const pending = useRef<Pending>(undefined);
  const failed = useRef<Pending>(undefined);
  const sending = useRef(false);

  async function flush() {
    if (sending.current) return;
    sending.current = true;
    try {
      while (pending.current !== undefined) {
        const value = pending.current;
        pending.current = undefined;
        setStatus("saving");
        const body = new URLSearchParams({ questionId, position: String(position) });
        if (value === null) body.set("intent", "clear");
        else body.set("optionId", value);
        let response: Response | null = null;
        try {
          response = await fetch(action, {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              accept: "application/json",
            },
            body,
            redirect: "manual",
          });
        } catch {
          response = null;
        }
        // Signed out, time over, or already finished: show the server's view.
        if (
          response &&
          (response.type === "opaqueredirect" || response.status === 409)
        ) {
          window.location.reload();
          return;
        }
        if (!response?.ok) {
          // A newer choice made meanwhile supersedes the failed one.
          if (pending.current !== undefined) continue;
          failed.current = value;
          setStatus("failed");
          return;
        }
        if (pending.current === undefined) {
          setStatus(value === null ? "cleared" : "saved");
        }
      }
    } finally {
      sending.current = false;
    }
  }

  function send(value: string | null) {
    failed.current = undefined;
    pending.current = value;
    void flush();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!enhanced) return;
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.value === "clear") {
      setSelected(null);
      send(null);
    } else if (selected) {
      send(selected);
    }
  }

  const message =
    status === "saving"
      ? labels.saving
      : status === "saved"
        ? labels.saved
        : status === "cleared"
          ? labels.cleared
          : status === "failed"
            ? labels.failed
            : "";

  return (
    <form
      method="post"
      action={action}
      onSubmit={onSubmit}
      className="answer-form"
      data-enhanced={enhanced ? "" : undefined}
    >
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="position" value={position} />
      <fieldset className="answer-form__fieldset">
        <legend className="answer-form__legend">
          <span className="answer-form__heading">
            <span>{labels.heading}</span>
            <span className="badge badge--soft">{labels.points}</span>
          </span>
          <span className="question__text" dir="auto">
            {text}
          </span>
        </legend>
        <div className="answer-options">
          {options.map((option) => (
            <label key={option.id} className="answer-option">
              <input
                type="radio"
                name="optionId"
                value={option.id}
                checked={selected === option.id}
                onChange={() => {
                  setSelected(option.id);
                  if (enhanced) send(option.id);
                }}
              />
              <span dir="auto">{option.text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="answer-form__footer">
        <p
          className={
            status === "failed" ? "answer-status answer-status--failed" : "answer-status"
          }
          aria-live="polite"
        >
          {message}
        </p>
        <div className="answer-form__actions">
          {status === "failed" ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                if (failed.current !== undefined) send(failed.current);
              }}
            >
              {labels.retry}
            </button>
          ) : null}
          <button
            type="submit"
            name="intent"
            value="save"
            className="button button--quiet answer-form__save"
          >
            {labels.save}
          </button>
          <button
            type="submit"
            name="intent"
            value="clear"
            className="button button--quiet"
            disabled={enhanced && selected === null}
          >
            {labels.clear}
          </button>
        </div>
      </div>
    </form>
  );
}
