import Image from "next/image";
import ReactMarkdown from "react-markdown";

export function Markdown({ body }: { body: string }) {
  return (
    <div className="min-w-0 break-words leading-relaxed [&_p]:my-3 [&_p]:whitespace-pre-wrap [&_h1]:mt-5 [&_h1]:font-display [&_h1]:text-2xl [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h3]:mt-4 [&_h3]:font-bold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-pink [&_blockquote]:pl-4 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-cream [&_pre]:p-4 [&_code]:font-mono [&_code]:text-sm [&_hr]:my-5 [&_hr]:border-ink/20">
      <ReactMarkdown skipHtml components={{
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{children}</a>,
        img: ({ src, alt }) => {
          if (typeof src !== "string" || !src.startsWith("https://")) return null;
          return <Image src={src} alt={alt ?? ""} width={1200} height={800} unoptimized
            className="my-4 h-auto max-h-[70vh] max-w-full rounded-xl border-2 border-ink object-contain" />;
        },
      }}>{body}</ReactMarkdown>
    </div>
  );
}
