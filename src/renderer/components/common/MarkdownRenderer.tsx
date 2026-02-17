import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mt-4 mb-2 text-gray-900">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mt-3 mb-1.5 text-gray-900">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mt-2 mb-1 text-gray-800">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold mt-2 mb-1 text-gray-800">{children}</h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-xs font-semibold mt-1.5 mb-0.5 text-gray-800">{children}</h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-xs font-semibold mt-1.5 mb-0.5 text-gray-700">{children}</h6>
        ),
        p: ({ children }) => (
          <p className="my-2 text-gray-700 leading-relaxed text-sm">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 ml-4 space-y-1 list-disc text-gray-700 text-sm">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-4 space-y-1 list-decimal text-gray-700 text-sm">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="ml-2">{children}</li>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-blue-600 hover:underline cursor-pointer break-words"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-gray-100 rounded p-3 my-2 overflow-x-auto text-xs font-mono text-gray-800 border border-gray-300">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic text-sm">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <table className="my-2 border-collapse border border-gray-300 text-sm w-full">
            {children}
          </table>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-100">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody>{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="border border-gray-300">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-800">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-300 px-2 py-1 text-gray-700">{children}</td>
        ),
        hr: () => (
          <hr className="my-3 border-gray-300" />
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-800">{children}</em>
        ),
        del: ({ children }) => (
          <del className="line-through text-gray-500">{children}</del>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
