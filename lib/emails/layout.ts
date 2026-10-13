interface EmailContent {
  subject: string;
  badge: string;
  badgeColor: "#b8f04a" | "#ffd23f";
  headline: string;
  paragraphs: readonly string[];
  button: string;
  url: string;
  notes: readonly string[];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const siteUrl = "https://www.startupfans.co";
const footer = "startupfans · for people who like things early";
const font = "Arial, Helvetica, sans-serif";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function renderEmail(content: EmailContent): RenderedEmail {
  const url = new URL(content.url);
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new Error("Email links must use http or https without credentials.");
  }
  const href = escapeHtml(url.toString());
  const paragraphs = content.paragraphs.map((paragraph) =>
    `<p style="margin:0 0 16px;color:#16120f;font-size:18px;line-height:28px;">${escapeHtml(paragraph)}</p>`).join("");
  const notes = content.notes.map((note) =>
    `<p style="margin:16px 0 0;color:#16120f;font-size:14px;line-height:22px;">${escapeHtml(note)}</p>`).join("");

  return {
    subject: content.subject,
    text: ["startupfans", content.badge, content.headline, ...content.paragraphs,
      `${content.button}:\n${url}`, ...content.notes, footer, siteUrl].join("\n\n"),
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;padding:0;background-color:#fff4e0;color:#16120f;font-family:${font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff4e0" style="width:100%;background-color:#fff4e0;color:#16120f;font-family:${font};">
  <tr><td align="center" bgcolor="#fff4e0" style="padding:32px 16px;background-color:#fff4e0;color:#16120f;">
    <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#fff4e0" style="background-color:#fff4e0;color:#16120f;"><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;table-layout:fixed;background-color:#fff4e0;color:#16120f;">
      <tr><td bgcolor="#fff4e0" style="padding:0 0 28px;background-color:#fff4e0;color:#16120f;">
        <a href="${siteUrl}" style="color:#16120f;text-decoration:none;font-size:24px;font-weight:900;"><img src="${siteUrl}/logo/startupfans-logo-on-light.png" width="220" alt="startupfans" style="display:block;width:220px;max-width:100%;height:auto;border:0;color:#16120f;font-family:${font};font-size:24px;font-weight:900;"></a>
      </td></tr>
      <tr><td bgcolor="#16120f" style="padding:0 8px 8px 0;background-color:#16120f;color:#16120f;border-radius:24px;overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#16120f" style="width:100%;table-layout:fixed;border-collapse:separate;border-radius:24px;overflow:hidden;background-color:#16120f;color:#16120f;">
          <tr><td bgcolor="#fff4e0" style="background-color:#fff4e0;color:#16120f;border:3px solid #16120f;border-radius:24px;overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff4e0" style="width:100%;table-layout:fixed;border-collapse:separate;border-radius:24px;overflow:hidden;background-color:#fff4e0;color:#16120f;">
          <tr><td bgcolor="#fff4e0" style="padding:28px;background-color:#fff4e0;color:#16120f;border-radius:24px;overflow:hidden;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${content.badgeColor}" style="border-collapse:separate;border-radius:12px;overflow:hidden;background-color:${content.badgeColor};color:#16120f;">
              <tr><td bgcolor="${content.badgeColor}" style="padding:8px 14px;background-color:${content.badgeColor};color:#16120f;border:2px solid #16120f;border-radius:12px;overflow:hidden;font-family:${font};font-size:12px;line-height:18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(content.badge)}</td></tr>
            </table>
            <h1 style="margin:28px 0 20px;color:#16120f;font-family:${font};font-size:42px;line-height:46px;letter-spacing:-1.5px;font-weight:900;">${escapeHtml(content.headline)}</h1>
            ${paragraphs}
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff4e0" style="background-color:#fff4e0;color:#16120f;">
              <tr><td bgcolor="#fff4e0" style="padding-top:24px;background-color:#fff4e0;color:#16120f;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:62px;v-text-anchor:middle;width:240px;" arcsize="52%" strokecolor="#16120f" strokeweight="3px" fillcolor="#ff5fa8">
                  <w:anchorlock/>
                  <center style="color:#16120f;font-family:${font};font-size:18px;font-weight:800;">${escapeHtml(content.button)}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#ff5fa8" style="border-collapse:separate;border-radius:16px;overflow:hidden;background-color:#ff5fa8;color:#16120f;">
                  <tr><td align="center" bgcolor="#ff5fa8" style="background-color:#ff5fa8;color:#16120f;border:3px solid #16120f;border-radius:16px;overflow:hidden;">
                    <a href="${href}" style="display:inline-block;padding:16px 28px;border-radius:16px;background-color:#ff5fa8;color:#16120f;font-family:${font};font-size:18px;line-height:24px;font-weight:800;text-decoration:none;">${escapeHtml(content.button)}</a>
                  </td></tr>
                </table>
                <!--<![endif]-->
              </td></tr>
            </table>
            <p style="margin:20px 0 6px;color:#16120f;font-size:12px;line-height:18px;">Or copy this link into your browser:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;table-layout:fixed;margin-bottom:24px;border-collapse:separate;border-radius:12px;overflow:hidden;background-color:#ffffff;color:#16120f;">
              <tr><td bgcolor="#ffffff" style="padding:12px;background-color:#ffffff;color:#16120f;border:2px solid #16120f;border-radius:12px;overflow:hidden;font-size:12px;line-height:18px;word-break:break-all;overflow-wrap:anywhere;"><a href="${href}" style="color:#2f7493;text-decoration:underline;">${href}</a></td></tr>
            </table>
            ${notes}
          </td></tr>
        </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td bgcolor="#fff4e0" style="padding:28px 0 0;background-color:#fff4e0;color:#16120f;">
        <p style="margin:0 0 8px;color:#16120f;font-size:12px;line-height:20px;">${footer}</p>
        <a href="${siteUrl}" style="color:#2f7493;font-size:12px;line-height:20px;text-decoration:underline;">startupfans.co</a>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`,
  };
}
