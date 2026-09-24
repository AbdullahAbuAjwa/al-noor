import { formatHundredths } from "@/i18n/format";
import type { Locale } from "@/i18n/locale";
import { messages } from "@/i18n/messages";
import type { QuizResults } from "@/server/results/results";

export function ResultsTable({
  locale,
  results,
}: {
  locale: Locale;
  results: QuizResults;
}) {
  const copy = messages[locale].results;
  const { summary } = results;
  return (
    <section className="card" id="results" aria-labelledby="results-title">
      <h2 id="results-title">{copy.heading}</h2>
      <dl className="facts">
        <div>
          <dt>{copy.assigned}</dt>
          <dd>{summary.assigned}</dd>
        </div>
        <div>
          <dt>{copy.finished}</dt>
          <dd>{summary.finished}</dd>
        </div>
        <div>
          <dt>{copy.inProgress}</dt>
          <dd>{summary.inProgress}</dd>
        </div>
        <div>
          <dt>{copy.notStarted}</dt>
          <dd>{summary.notStarted}</dd>
        </div>
        <div>
          <dt>{copy.average}</dt>
          <dd dir="ltr">
            {summary.averagePercent === null ? "—" : `${summary.averagePercent}%`}
          </dd>
        </div>
      </dl>
      {/* Wide tables scroll inside the card on phones, not the whole page. */}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{copy.student}</th>
              <th scope="col">{copy.className}</th>
              <th scope="col">{copy.status}</th>
              <th scope="col">{copy.score}</th>
              <th scope="col">{copy.correct}</th>
              <th scope="col">{copy.incorrect}</th>
              <th scope="col">{copy.unanswered}</th>
            </tr>
          </thead>
          <tbody>
            {results.rows.map((row) => (
              <tr key={row.username}>
                <th scope="row">{row.studentName}</th>
                <td>{row.className}</td>
                <td>{copy.statuses[row.status]}</td>
                <td dir="ltr">
                  {row.scoreHundredths === null || row.maxScoreHundredths === null
                    ? "—"
                    : `${formatHundredths(row.scoreHundredths)} / ${formatHundredths(row.maxScoreHundredths)}`}
                </td>
                <td>{row.correctCount ?? "—"}</td>
                <td>{row.incorrectCount ?? "—"}</td>
                <td>{row.unansweredCount ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
