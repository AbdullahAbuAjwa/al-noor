import { formatHundredths } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";

export type QuestionFormValues = {
  text: string;
  pointsHundredths: number;
  options: string[];
  correctPosition: number;
};

// Plain HTML form; `dir="auto"` lets Arabic and English content each read in
// its own direction regardless of the interface language.
export function QuestionForm({
  locale,
  action,
  idPrefix,
  values,
  submitLabel,
}: {
  locale: Locale;
  action: string;
  idPrefix: string;
  values?: QuestionFormValues;
  submitLabel: string;
}) {
  const copy = messages[locale].questions;
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form action={action} method="post" className="form">
      <input type="hidden" name="intent" value="save" />
      <div className="field">
        <label htmlFor={id("text")}>{copy.text}</label>
        <textarea
          id={id("text")}
          name="text"
          dir="auto"
          rows={3}
          maxLength={500}
          required
          defaultValue={values?.text ?? ""}
        />
      </div>
      <div className="field field--short">
        <label htmlFor={id("points")}>{copy.points}</label>
        <input
          id={id("points")}
          name="points"
          type="number"
          inputMode="decimal"
          dir="ltr"
          min={0.01}
          max={1000}
          step={0.01}
          required
          aria-describedby={id("points-hint")}
          defaultValue={values ? formatHundredths(values.pointsHundredths) : "1"}
        />
        <p className="field-hint" id={id("points-hint")}>
          {copy.pointsHint}
        </p>
      </div>
      <fieldset className="field">
        <legend>{copy.options}</legend>
        <p className="field-hint">{copy.optionsHint}</p>
        {[1, 2, 3, 4].map((position) => (
          <div key={position} className="option-row">
            <label className="option-row__correct">
              <input
                type="radio"
                name="correctOption"
                value={position}
                required
                defaultChecked={values?.correctPosition === position}
              />
              <span className="visually-hidden">
                {copy.markCorrect(position)}
              </span>
            </label>
            <div className="field">
              <label htmlFor={id(`option${position}`)}>
                {copy.option(position)}
              </label>
              <input
                id={id(`option${position}`)}
                name={`option${position}`}
                type="text"
                dir="auto"
                maxLength={200}
                required
                defaultValue={values?.options[position - 1] ?? ""}
              />
            </div>
          </div>
        ))}
      </fieldset>
      <div className="form-actions">
        <button type="submit" className="button button--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
