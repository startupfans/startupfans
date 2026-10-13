import "server-only";

import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

let loggerProvider: LoggerProvider | null = null;

type LogOperation = "startup_created" | "post_created" | "magic_link_verified";

function configuredValue(key: "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN" | "NEXT_PUBLIC_POSTHOG_HOST") {
  const value = process.env[key];
  if (value) return value;

  if (process.env.NODE_ENV !== "production") {
    throw new Error(`${key} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${key} is configured`);
  }
  return null;
}

export function configurePostHogLogs() {
  if (loggerProvider) return loggerProvider;

  const token = configuredValue("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN");
  const host = configuredValue("NEXT_PUBLIC_POSTHOG_HOST");
  if (!token || !host) return null;

  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({ "service.name": "startupfans" }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host.replace(/\/$/, "")}/i/v1/logs`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      }),
    ],
  });

  return loggerProvider;
}

export async function emitPostHogLog(operation: LogOperation) {
  const provider = configurePostHogLogs();
  if (!provider) return;

  try {
    provider.getLogger("startupfans.posthog-export").emit({
      body: `Completed ${operation}`,
      severityNumber: SeverityNumber.INFO,
      attributes: { operation },
    });
    await provider.forceFlush();
  } catch {
    // Log delivery must not interrupt a completed user operation.
  }
}
