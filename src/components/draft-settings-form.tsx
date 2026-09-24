import { formatPercentFromBps } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";

export type DraftFormValues = {
  title: string;
  classIds: string[];
  durationMinutes: number;
  penaltyBps: number;
};

// Plain HTML form: works without JavaScript; the server re-validates everything.
export function DraftSettingsForm({
  locale,
  action,
  classes,
  values,
  submitLabel,
}: {
  locale: Locale;
  action: string;
  classes: { id: string; name: string }[];
  values?: DraftFormValues;
  submitLabel: string;
}) {
  const copy = messages[locale].authoring;
  const selected = new Set(
    values?.classIds ?? (classes.length === 1 ? [classes[0].id] : []),
  );

  return (
    <form action={action} method="post" className="form">
      <div className="field">
        <label htmlFor="title">{copy.title}</label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={120}
          required
          defaultValue={values?.title ?? ""}
        />
      </div>
      <fieldset className="field">
        <legend>{copy.classes}</legend>
        <p className="field-hint">{copy.classesHint}</p>
        <div className="choice-list">
          {classes.map((entry) => (
            <label key={entry.id} className="choice">
              <input
                type="checkbox"
                name="classId"
                value={entry.id}
                defaultChecked={selected.has(entry.id)}
              />
              <span dir="ltr">{entry.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field-row">
        <div className="field">
          <label htmlFor="durationMinutes">{copy.duration}</label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            inputMode="numeric"
            dir="ltr"
            min={1}
            max={180}
            step={1}
            required
            aria-describedby="duration-hint"
            defaultValue={values?.durationMinutes ?? 20}
          />
          <p className="field-hint" id="duration-hint">
            {copy.durationHint}
          </p>
        </div>
        <div className="field">
          <label htmlFor="penaltyPercent">{copy.penalty}</label>
          <input
            id="penaltyPercent"
            name="penaltyPercent"
            type="number"
            inputMode="decimal"
            dir="ltr"
            min={0}
            max={100}
            step={0.01}
            required
            aria-describedby="penalty-hint"
            defaultValue={values ? formatPercentFromBps(values.penaltyBps) : "0"}
          />
          <p className="field-hint" id="penalty-hint">
            {copy.penaltyHint}
          </p>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="button button--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
