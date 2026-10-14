import Link from "next/link";

export function TimeLink({ href, dateTime, children, className = "" }: {
  href: string;
  dateTime: string;
  children: string;
  className?: string;
}) {
  const absoluteDate = new Date(dateTime).toLocaleString("en-GB", { timeZone: "UTC" });
  return (
    <Link href={href} title={absoluteDate}
      className={`-my-3 inline-flex min-h-11 items-center hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:my-0 sm:min-h-0 ${className}`}>
      <time dateTime={dateTime} title={absoluteDate}>{children}</time>
    </Link>
  );
}
