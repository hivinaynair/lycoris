import type { ReactNode } from "react";

export function DocsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="min-w-0 scroll-mt-8 space-y-5 border-t border-border pt-8"
    >
      <h2 id={`${id}-heading`} className="text-2xl font-medium tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DocsTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-border">
              {row.map((cell, index) => (
                <td
                  key={headers[index]}
                  className="px-4 py-3 align-top leading-6 first:font-mono first:text-xs"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
