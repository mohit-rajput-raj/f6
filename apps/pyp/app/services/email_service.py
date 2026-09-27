"""
Email Service for UNIXL AI Server.
Dispatches emails with attachments (PDF, CSV, Excel, Images) and validates recipient emails.
"""

import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import base64
from datetime import datetime
from typing import List, Dict, Any, Optional

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email_address(email: str) -> bool:
    """Validate email address using standard RFC-compatible regex."""
    if not email or not isinstance(email, str):
        return False
    clean = email.strip()
    return bool(EMAIL_REGEX.match(clean))


def dispatch_single_email(
    to_email: str,
    subject: str,
    body: str,
    attachments: Optional[List[Dict[str, Any]]] = None,
    smtp_config: Optional[Dict[str, Any]] = None,
    is_html: bool = True,
) -> Dict[str, Any]:
    """
    Send an email via SMTP (or fallback logger) with optional attachments.
    Attachments format:
    [{ "filename": "doc.pdf", "content_base64": "...", "mime_type": "application/pdf", "url": "..." }]
    """
    # 1. Regex validation
    if not validate_email_address(to_email):
        return {
            "success": False,
            "status": "500",
            "error": "Invalid email address format (regex validation failed)",
        }

    smtp_cfg = smtp_config or {}
    host = smtp_cfg.get("host") or os.getenv("SMTP_HOST")
    port = int(smtp_cfg.get("port") or os.getenv("SMTP_PORT") or 587)
    user = smtp_cfg.get("user") or os.getenv("SMTP_USER")
    password = smtp_cfg.get("password") or os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD")
    from_email = smtp_cfg.get("from_email") or os.getenv("EMAIL_FROM") or user or "notifications@unixl.io"
    use_tls = smtp_cfg.get("use_tls", True)

    # 2. Build MIME message
    msg = MIMEMultipart("mixed")
    msg["From"] = from_email
    msg["To"] = to_email.strip()
    msg["Subject"] = subject or "Notification"

    # Message body (text or HTML)
    alt_part = MIMEMultipart("alternative")
    if is_html:
        # Also include plain text fallback
        plain_text = re.sub(r"<[^>]+>", "", body)
        alt_part.attach(MIMEText(plain_text, "plain", "utf-8"))
        alt_part.attach(MIMEText(body, "html", "utf-8"))
    else:
        alt_part.attach(MIMEText(body, "plain", "utf-8"))
    msg.attach(alt_part)

    # Process attachments (PDF, CSV, Excel, Images)
    if attachments:
        for att in attachments:
            try:
                filename = att.get("filename") or "attachment.dat"
                b64_data = att.get("content_base64")
                file_bytes = None
                if b64_data:
                    if "," in b64_data:
                        b64_data = b64_data.split(",")[1]
                    file_bytes = base64.b64decode(b64_data)
                elif att.get("url"):
                    try:
                        import urllib.request
                        req = urllib.request.Request(att["url"], headers={"User-Agent": "UNIXL-Email/1.0"})
                        with urllib.request.urlopen(req, timeout=10) as resp:
                            file_bytes = resp.read()
                    except Exception as url_err:
                        print(f"[EmailService] Could not fetch attachment from URL {att.get('url')}: {url_err}")

                if file_bytes:
                    mime_type = att.get("mime_type", "application/octet-stream")
                    main_type, _, sub_type = mime_type.partition("/")

                    part = MIMEBase(main_type or "application", sub_type or "octet-stream")
                    part.set_payload(file_bytes)
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f'attachment; filename="{filename}"',
                    )
                    msg.attach(part)
            except Exception as att_err:
                print(f"[EmailService] Failed to attach {att.get('filename')}: {att_err}")

    # 3. Deliver via SMTP if configured, else dev mode
    if host and user and password:
        try:
            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=15)
            else:
                server = smtplib.SMTP(host, port, timeout=15)
                if use_tls:
                    server.starttls()

            server.login(user, password)
            server.sendmail(from_email, [to_email.strip()], msg.as_string())
            server.quit()

            return {
                "success": True,
                "status": "sent success",
                "details": f"Delivered via SMTP ({host})",
            }
        except Exception as smtp_err:
            return {
                "success": False,
                "status": "500",
                "error": f"SMTP Error: {str(smtp_err)}",
            }
    else:
        # Development / test mode fallback logger
        print("\n" + "=" * 60)
        print(f"📧 [UNIXL EMAIL DEV DISPATCH]")
        print(f"To: {to_email}")
        print(f"From: {from_email}")
        print(f"Subject: {subject}")
        print(f"Attachments count: {len(attachments or [])}")
        print(f"Body preview: {body[:150]}...")
        print("=" * 60 + "\n")

        return {
            "success": True,
            "status": "sent success",
            "details": "Delivered (Dev Mode / Test Dispatch)",
        }


def process_batch_email_dispatch(
    recipients: List[Dict[str, Any]],
    smtp_config: Optional[Dict[str, Any]] = None,
    key_column_name: str = "Key",
) -> Dict[str, Any]:
    """
    Process a list of email dispatch jobs and format output table with:
    Columns: [key_column_name, "Email", "Status", "Details", "SentAt"]
    """
    output_rows = []
    errors_list = []
    sent_count = 0
    fail_count = 0

    now_iso = datetime.now().isoformat()

    for item in recipients:
        key_val = str(item.get("key", "") or "")
        email_val = str(item.get("email", "") or "").strip()
        subject = item.get("subject", "Automated Notification")
        body = item.get("body", "")
        attachments = item.get("attachments", [])
        is_html = item.get("is_html", True)

        res = dispatch_single_email(
            to_email=email_val,
            subject=subject,
            body=body,
            attachments=attachments,
            smtp_config=smtp_config,
            is_html=is_html,
        )

        sent_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if res["success"]:
            sent_count += 1
            output_rows.append([
                key_val,
                "sent success",
                email_val,
                res.get("details", "Sent"),
                sent_at,
            ])
        else:
            fail_count += 1
            error_reason = res.get("error", "Unknown error")
            output_rows.append([
                key_val,
                "500",
                email_val,
                error_reason,
                sent_at,
            ])
            errors_list.append({
                "key": key_val,
                "email": email_val,
                "status": 500,
                "error": error_reason,
            })

    table = {
        "columns": [key_column_name, "Status", "Email", "Details", "SentAt"],
        "data": output_rows,
    }

    return {
        "success": fail_count == 0,
        "partial": sent_count > 0 and fail_count > 0,
        "summary": {
            "total": len(recipients),
            "sent": sent_count,
            "failed": fail_count,
        },
        "table": table,
        "errors": errors_list,
    }
