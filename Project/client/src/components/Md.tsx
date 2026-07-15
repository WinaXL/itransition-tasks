import ReactMarkdown from "react-markdown";

export default function Md({ children }: { children: string }) {
  return (
    <div className="prose-md">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
