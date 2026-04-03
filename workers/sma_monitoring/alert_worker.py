"""
SMA Alert Worker

Sends email notifications for high-severity change events.

Architecture:
- Query unprocessed change events with high severity
- Generate email notifications
- Send via SMTP (configurable)
- Mark alerts as sent

Usage:
    python alert_worker.py --check-alerts
    python alert_worker.py --send-pending
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
DATABASE_URL = os.getenv('DATABASE_URL')
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
ALERT_FROM_EMAIL = os.getenv('ALERT_FROM_EMAIL', SMTP_USER)
ALERT_TO_EMAILS = os.getenv('ALERT_TO_EMAILS', '').split(',')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")


class EmailAlertSender:
    """
    Email notification sender for high-severity changes.
    """

    def __init__(self, smtp_host: str, smtp_port: int, smtp_user: str, smtp_password: str):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password

    def send_alert(self, to_emails: List[str], subject: str, html_body: str) -> bool:
        """Send email alert via SMTP."""
        if not self.smtp_user or not self.smtp_password:
            logger.warning("SMTP credentials not configured, skipping email send")
            return False

        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = ALERT_FROM_EMAIL
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject

            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {len(to_emails)} recipient(s)")
            return True

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def generate_change_alert_html(self, change_event: Dict, strategy_name: str, provider_name: str) -> str:
        """Generate HTML email body for change alert."""

        material_changes = change_event.get('material_changes_json', [])
        if isinstance(material_changes, str):
            material_changes = json.loads(material_changes)

        field_changes = change_event.get('field_changes_json', [])
        if isinstance(field_changes, str):
            field_changes = json.loads(field_changes)

        material_changes_html = ""
        if material_changes:
            material_changes_html = "<ul style='margin: 10px 0;'>"
            for change in material_changes[:5]:  # Limit to 5
                material_changes_html += f"<li style='margin: 5px 0;'>{change}</li>"
            material_changes_html += "</ul>"

        field_changes_html = ""
        if field_changes:
            field_changes_html = "<table style='border-collapse: collapse; width: 100%; margin: 10px 0;'>"
            field_changes_html += "<tr style='background-color: #f5f5f5;'><th style='padding: 8px; text-align: left; border: 1px solid #ddd;'>Field</th><th style='padding: 8px; text-align: left; border: 1px solid #ddd;'>Old Value</th><th style='padding: 8px; text-align: left; border: 1px solid #ddd;'>New Value</th></tr>"
            for fc in field_changes[:5]:  # Limit to 5
                field_name = fc.get('field', 'Unknown').replace('_', ' ').title()
                old_val = str(fc.get('old_value', ''))[:50]
                new_val = str(fc.get('new_value', ''))[:50]
                field_changes_html += f"<tr><td style='padding: 8px; border: 1px solid #ddd;'>{field_name}</td><td style='padding: 8px; border: 1px solid #ddd;'>{old_val}</td><td style='padding: 8px; border: 1px solid #ddd;'>{new_val}</td></tr>"
            field_changes_html += "</table>"

        severity_color = {
            'high': '#dc2626',
            'medium': '#f59e0b',
            'low': '#6b7280'
        }.get(change_event.get('severity', 'medium'), '#6b7280')

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: {severity_color}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px;">SMA Strategy Change Alert</h2>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">{change_event.get('severity', 'medium').upper()} SEVERITY</p>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #333;">{strategy_name}</h3>
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Provider:</strong> {provider_name}</p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Detected:</strong> {change_event.get('detected_at', 'Unknown')}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="color: #333; border-bottom: 2px solid #e5e5e5; padding-bottom: 5px;">Change Summary</h4>
                <p style="margin: 10px 0;">{change_event.get('change_summary', 'Content updated')}</p>
            </div>

            {f'''
            <div style="margin-bottom: 20px;">
                <h4 style="color: #333; border-bottom: 2px solid #e5e5e5; padding-bottom: 5px;">Material Changes</h4>
                {material_changes_html}
            </div>
            ''' if material_changes else ''}

            {f'''
            <div style="margin-bottom: 20px;">
                <h4 style="color: #333; border-bottom: 2px solid #e5e5e5; padding-bottom: 5px;">Field Changes</h4>
                {field_changes_html}
            </div>
            ''' if field_changes else ''}

            {f'''
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin-bottom: 20px;">
                <strong style="color: #856404;">⚠ Advisor Action Required</strong>
                <p style="margin: 5px 0 0 0; color: #856404;">This change requires advisor review and action.</p>
            </div>
            ''' if change_event.get('advisor_action_required') else ''}

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
                <p style="color: #999; font-size: 12px;">
                    This is an automated alert from FMSS SMA Monitoring System<br>
                    To manage your alert preferences, contact your administrator
                </p>
            </div>
        </body>
        </html>
        """

        return html


class AlertWorker:
    """
    Main alert worker orchestrator.
    """

    def __init__(self, db_url: str, email_sender: EmailAlertSender):
        self.db_url = db_url
        self.email_sender = email_sender

    def get_unalerted_high_severity_changes(self) -> List[Dict]:
        """
        Get high-severity change events that haven't been alerted yet.
        """
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        try:
            query = """
                SELECT
                    ce.id,
                    ce.document_id,
                    ce.change_summary,
                    ce.material_changes_json,
                    ce.field_changes_json,
                    ce.severity,
                    ce.advisor_action_required,
                    ce.detected_at,
                    pd.strategy_name,
                    p.provider_name
                FROM fmss_sma_change_events ce
                LEFT JOIN fmss_sma_parsed_documents pd ON ce.document_id = pd.document_id
                LEFT JOIN fmss_sma_fact_sheet_documents d ON ce.document_id = d.id
                LEFT JOIN fmss_sma_providers p ON d.provider_id = p.id
                WHERE ce.severity = 'high'
                  AND ce.id NOT IN (
                      SELECT change_event_id FROM fmss_sma_document_alerts WHERE status = 'sent'
                  )
                  AND ce.detected_at > NOW() - INTERVAL '7 days'
                ORDER BY ce.detected_at DESC
                LIMIT 50
            """

            cursor.execute(query)
            results = cursor.fetchall()

            return [dict(row) for row in results]

        finally:
            cursor.close()
            conn.close()

    def create_alert_record(self, change_event_id: str, alert_type: str = 'email') -> str:
        """Create alert record in database."""
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO fmss_sma_document_alerts (
                    id, change_event_id, alert_type, status, created_at
                )
                VALUES (gen_random_uuid(), %s, %s, 'pending', NOW())
                RETURNING id
            """, (change_event_id, alert_type))

            alert_id = cursor.fetchone()[0]
            conn.commit()

            return alert_id

        finally:
            cursor.close()
            conn.close()

    def mark_alert_sent(self, alert_id: str) -> bool:
        """Mark alert as sent."""
        conn = psycopg2.connect(self.db_url)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                UPDATE fmss_sma_document_alerts
                SET status = 'sent', sent_at = NOW()
                WHERE id = %s
            """, (alert_id,))

            conn.commit()
            return True

        except Exception as e:
            logger.error(f"Failed to mark alert as sent: {e}")
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    def run(self, send_alerts: bool = True):
        """Main execution method."""

        logger.info("="*60)
        logger.info("SMA ALERT WORKER")
        logger.info("="*60)

        # Get unalerted high-severity changes
        changes = self.get_unalerted_high_severity_changes()

        if not changes:
            logger.info("No high-severity changes requiring alerts")
            return

        logger.info(f"Found {len(changes)} high-severity changes to alert")

        if not send_alerts:
            logger.info("Send alerts disabled, exiting")
            return

        if not ALERT_TO_EMAILS or not ALERT_TO_EMAILS[0]:
            logger.warning("No alert recipients configured (ALERT_TO_EMAILS), skipping")
            return

        # Send alerts for each change
        sent_count = 0
        failed_count = 0

        for change in changes:
            try:
                # Create alert record
                alert_id = self.create_alert_record(change['id'])

                # Generate email HTML
                html_body = self.email_sender.generate_change_alert_html(
                    change,
                    change.get('strategy_name', 'Unknown Strategy'),
                    change.get('provider_name', 'Unknown Provider')
                )

                # Send email
                subject = f"[FMSS Alert] {change.get('severity', 'high').upper()}: {change.get('strategy_name', 'Strategy')} Changed"

                if self.email_sender.send_alert(ALERT_TO_EMAILS, subject, html_body):
                    self.mark_alert_sent(alert_id)
                    sent_count += 1
                else:
                    failed_count += 1

            except Exception as e:
                logger.error(f"Failed to process alert for change {change['id']}: {e}")
                failed_count += 1

        logger.info("="*60)
        logger.info(f"ALERT PROCESSING COMPLETE")
        logger.info(f"  Sent: {sent_count}")
        logger.info(f"  Failed: {failed_count}")
        logger.info("="*60)


def main():
    parser = argparse.ArgumentParser(description='SMA Alert Worker')
    parser.add_argument('--check-alerts', action='store_true', help='Check for pending alerts (dry run)')
    parser.add_argument('--send-pending', action='store_true', help='Send pending alert emails')

    args = parser.parse_args()

    if not any([args.check_alerts, args.send_pending]):
        parser.print_help()
        sys.exit(1)

    # Initialize email sender
    email_sender = EmailAlertSender(SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)

    # Initialize worker
    worker = AlertWorker(DATABASE_URL, email_sender)

    # Run worker
    send_alerts = args.send_pending
    worker.run(send_alerts=send_alerts)


if __name__ == '__main__':
    main()
