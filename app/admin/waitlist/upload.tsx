"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadWaitlistAction } from "./actions";

function UploadButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={!ready || pending}
    className="min-h-11 rounded-xl border-2 border-ink bg-sky px-4 py-2 font-bold disabled:opacity-50">
    {pending ? "Importing…" : "Import CSV"}
  </button>;
}

export function WaitlistUpload() {
  const [ready, setReady] = useState(false);
  return (
    <form action={uploadWaitlistAction} className="min-w-0 space-y-3">
      <label htmlFor="waitlist-csv" className="block font-bold">Upload a waitlist CSV</label>
      <input id="waitlist-csv" name="csv" type="file" accept=".csv,text/csv" required
        onChange={(event) => setReady(Boolean(event.target.files?.length))}
        className="block min-h-11 w-full min-w-0 rounded-xl border-2 border-ink bg-white p-2 text-sm file:mr-2 file:min-h-11 file:rounded-lg file:border-0 file:bg-cream file:px-3 file:font-bold" />
      <p className="text-sm">An email column is required. Up to 500 KB. Importing keeps people waiting.</p>
      <UploadButton ready={ready} />
    </form>
  );
}
