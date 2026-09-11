"""
Alert Service — Multilingual alert creation and management.
Now with AI-powered auto-translation for regional NER languages.
"""
import logging
from typing import List, Optional
from ..database.db import get_connection
from ..models.alert import AlertCreate, AlertResponse

logger = logging.getLogger(__name__)


def create_alert(data: AlertCreate) -> AlertResponse:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO alerts (title, message_en, message_as, message_hi, message_mn, severity, district, target_audience)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (data.title, data.message_en, data.message_as, data.message_hi, data.message_mn,
         data.severity, data.district, data.target_audience)
    )
    conn.commit()
    row = cursor.execute("SELECT * FROM alerts WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return _row_to_response(row)


async def create_alert_with_translation(data: AlertCreate) -> AlertResponse:
    """
    Create an alert with AI auto-translation.
    If only message_en is provided, auto-translates to Assamese, Hindi, and Manipuri.
    """
    try:
        from .ai_router import translate_alert
        import asyncio

        # Only translate if regional languages are missing
        if data.message_en and not data.message_as:
            async def get_trans(lang_name):
                return await translate_alert(data.message_en, lang_name)

            translations = await asyncio.gather(
                get_trans("Assamese"),
                get_trans("Hindi"),
                get_trans("Manipuri (Meitei)")
            )

            if not data.message_as:
                data.message_as = translations[0]
            if not data.message_hi:
                data.message_hi = translations[1]
            if not data.message_mn:
                data.message_mn = translations[2]

            logger.info("Auto-translated alert to 3 languages via ai_router")
    except Exception as e:
        logger.warning(f"Auto-translation failed, creating alert with English only: {e}")

    return create_alert(data)


def get_alerts(active_only: bool = True) -> List[AlertResponse]:
    conn = get_connection()
    if active_only:
        rows = conn.execute("SELECT * FROM alerts WHERE is_active = 1 ORDER BY created_at DESC").fetchall()
    else:
        rows = conn.execute("SELECT * FROM alerts ORDER BY created_at DESC").fetchall()
    conn.close()
    return [_row_to_response(r) for r in rows]


def _row_to_response(row) -> AlertResponse:
    return AlertResponse(
        id=row["id"], title=row["title"],
        message_en=row["message_en"], message_as=row["message_as"],
        message_hi=row["message_hi"], message_mn=row["message_mn"],
        severity=row["severity"], district=row["district"],
        target_audience=row["target_audience"],
        is_active=bool(row["is_active"]), created_at=row["created_at"]
    )
