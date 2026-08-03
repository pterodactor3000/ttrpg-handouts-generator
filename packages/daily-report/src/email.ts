export interface EmailConfig {
  apiKey: string;
  from: string;
  recipients: string[];
}

export function parseRecipientList(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function resolveEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.REPORT_FROM_EMAIL?.trim();
  const recipients = env.REPORT_RECIPIENT_EMAIL ? parseRecipientList(env.REPORT_RECIPIENT_EMAIL) : [];

  if (!apiKey || !from || recipients.length === 0) return null;
  return { apiKey, from, recipients };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function sendReportEmail(params: {
  config: EmailConfig;
  subject: string;
  markdownBody: string;
}): Promise<void> {
  const { config, subject, markdownBody } = params;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: config.recipients,
      subject,
      text: markdownBody,
      html: `<!DOCTYPE html><html><body><pre style="font-family:ui-monospace,monospace;white-space:pre-wrap;">${escapeHtml(markdownBody)}</pre></body></html>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API HTTP ${response.status}: ${await response.text()}`);
  }
}
