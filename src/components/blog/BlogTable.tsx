import type { BlogResultRow } from "../../data/posts";

type BlogTableProps = {
  rows: BlogResultRow[];
};

export function BlogTable({ rows }: BlogTableProps) {
  return (
    <figure className="article-table-figure">
      <div className="table-frame article-table-frame">
        <table>
          <thead>
            <tr>
              <th scope="col">System</th>
              <th scope="col">Benchmark</th>
              <th scope="col" className="numeric">
                Resolved
              </th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.system}-${row.benchmark}`}>
                <td>{row.system}</td>
                <td>{row.benchmark}</td>
                <td className="numeric">{row.resolved}</td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        Table 1. Mock leaderboard excerpt rendered inside a technical report.
      </figcaption>
    </figure>
  );
}
