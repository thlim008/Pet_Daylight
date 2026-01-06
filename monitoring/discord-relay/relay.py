"""
Pet Daylight - Grafana/Alertmanager to Discord Relay
Grafana/Alertmanager 알림을 Discord Webhook으로 전달
"""

import os
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from pydantic import BaseModel, Field

load_dotenv()

# 환경변수
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK")
BOT_NAME = os.getenv("BOT_NAME", "Pet Daylight 모니터링 봇")
BOT_AVATAR = os.getenv("BOT_AVATAR", "")

if not DISCORD_WEBHOOK:
    raise RuntimeError("DISCORD_WEBHOOK is not set in .env file")

app = FastAPI(title="Pet Daylight Discord Relay")

# ===========================
# Grafana Alert 데이터 모델
# ===========================

class AlertLabels(BaseModel):
    alertname: Optional[str] = None
    instance: Optional[str] = None
    severity: Optional[str] = None
    job: Optional[str] = None
    service: Optional[str] = None

class AlertAnnotations(BaseModel):
    summary: Optional[str] = None
    description: Optional[str] = None
    runbook_url: Optional[str] = None

class Alert(BaseModel):
    labels: AlertLabels = Field(default_factory=AlertLabels)
    annotations: AlertAnnotations = Field(default_factory=AlertAnnotations)
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None
    generatorURL: Optional[str] = None
    status: Optional[str] = "firing"

class GrafanaPayload(BaseModel):
    status: Optional[str] = "unknown"
    alerts: List[Alert] = Field(default_factory=list)
    title: Optional[str] = None
    message: Optional[str] = None

# ===========================
# Discord 메시지 포맷팅
# ===========================

COLOR_MAP: Dict[str, int] = {
    "FIRING": 0xE74C3C,  # 빨강
    "RESOLVED": 0x2ECC71,  # 초록
    "NO_DATA": 0x95A5A6,  # 회색
    "ERROR": 0xE67E22,  # 주황
    "PENDING": 0xF1C40F,  # 노랑
    "firing": 0xE74C3C,
    "resolved": 0x2ECC71,
}

EMOJI_MAP: Dict[str, str] = {
    "critical": "🚨",
    "warning": "⚠️",
    "info": "ℹ️",
    "firing": "🔥",
    "resolved": "✅",
}

def _clip(s: Optional[str], limit: int) -> str:
    """문자열을 지정된 길이로 자름"""
    if not s:
        return ""
    return s[:limit] if len(s) > limit else s

def _build_embeds(payload: GrafanaPayload) -> List[Dict[str, Any]]:
    """Grafana 페이로드를 Discord embed 형식으로 변환"""
    status = (payload.status or "UNKNOWN").upper()
    color = COLOR_MAP.get(status, 0x3498DB)
    
    embeds: List[Dict[str, Any]] = []
    
    for alert in payload.alerts[:10]:  # 최대 10개만
        # Alert 상태 이모지
        alert_status = alert.status or "firing"
        severity = alert.labels.severity or "info"
        status_emoji = EMOJI_MAP.get(alert_status, "")
        severity_emoji = EMOJI_MAP.get(severity, "")
        
        # 제목
        alertname = alert.labels.alertname or "Alert"
        title = f"{severity_emoji} {alertname} [{status.upper()}]"
        title = _clip(title, 256)
        
        # 설명
        description_parts = []
        if alert.annotations.summary:
            description_parts.append(f"**요약:** {alert.annotations.summary}")
        if alert.annotations.description:
            description_parts.append(f"\n{alert.annotations.description}")
        
        description = "\n".join(description_parts)
        description = _clip(description, 4096)
        
        # 필드
        fields: List[Dict[str, Any]] = []
        
        if alert.labels.service:
            fields.append({
                "name": "Service",
                "value": _clip(alert.labels.service, 1024),
                "inline": True
            })
        
        if alert.labels.instance:
            fields.append({
                "name": "Instance",
                "value": _clip(alert.labels.instance, 1024),
                "inline": True
            })
        
        if alert.labels.severity:
            fields.append({
                "name": "Severity",
                "value": _clip(alert.labels.severity.upper(), 1024),
                "inline": True
            })
        
        if alert.annotations.runbook_url:
            fields.append({
                "name": "📖 Runbook",
                "value": f"[대응 가이드]({alert.annotations.runbook_url})",
                "inline": False
            })
        
        if alert.generatorURL:
            fields.append({
                "name": "🔗 Prometheus",
                "value": f"[알람 상세보기]({alert.generatorURL})",
                "inline": False
            })
        
        # Embed 생성
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "fields": fields,
            "timestamp": alert.startsAt or None,
            "footer": {
                "text": "Pet Daylight Monitoring"
            }
        }
        
        embeds.append(embed)
    
    return embeds

# ===========================
# API 엔드포인트
# ===========================

@app.get("/")
async def root() -> Dict[str, Any]:
    """헬스체크"""
    return {
        "ok": True,
        "service": "petdaylight-discord-relay",
        "version": "1.0.0"
    }

@app.get("/health")
async def health() -> Dict[str, Any]:
    """헬스체크 (k8s/docker용)"""
    return {"ok": True, "status": "healthy"}

@app.post("/grafana")
async def grafana_webhook(payload: GrafanaPayload) -> Dict[str, Any]:
    """
    Grafana Alert를 Discord로 전달
    """
    try:
        embeds = _build_embeds(payload)
        
        # Discord Webhook 메시지 구성
        body: Dict[str, Any] = {
            "username": BOT_NAME,
            "embeds": embeds if embeds else [],
        }
        
        if BOT_AVATAR:
            body["avatar_url"] = BOT_AVATAR
        
        # embed가 없으면 기본 메시지
        if not embeds:
            status = (payload.status or "UNKNOWN").upper()
            body["content"] = f"🔔 Grafana alert [{status}]"
        
        # Discord로 전송
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(DISCORD_WEBHOOK, json=body)
            resp.raise_for_status()
        
        return {"ok": True, "alerts_sent": len(payload.alerts)}
    
    except Exception as e:
        print(f"Error sending to Discord: {e}")
        return {"ok": False, "error": str(e)}

@app.post("/alertmanager")
async def alertmanager_webhook(request: Request) -> Dict[str, Any]:
    """
    Alertmanager 알림을 Discord로 전달
    """
    try:
        data = await request.json()
        
        # Alertmanager 형식을 Grafana 형식으로 변환
        alerts = []
        for am_alert in data.get("alerts", []):
            alert = Alert(
                labels=AlertLabels(**am_alert.get("labels", {})),
                annotations=AlertAnnotations(**am_alert.get("annotations", {})),
                startsAt=am_alert.get("startsAt"),
                endsAt=am_alert.get("endsAt"),
                generatorURL=am_alert.get("generatorURL"),
                status=am_alert.get("status", "firing")
            )
            alerts.append(alert)
        
        payload = GrafanaPayload(
            status=data.get("status", "firing"),
            alerts=alerts
        )
        
        embeds = _build_embeds(payload)
        
        body: Dict[str, Any] = {
            "username": BOT_NAME,
            "embeds": embeds if embeds else [],
        }
        
        if BOT_AVATAR:
            body["avatar_url"] = BOT_AVATAR
        
        if not embeds:
            body["content"] = f"🔔 Alertmanager alert [{payload.status}]"
        
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(DISCORD_WEBHOOK, json=body)
            resp.raise_for_status()
        
        return {"ok": True, "alerts_sent": len(alerts)}
    
    except Exception as e:
        print(f"Error processing Alertmanager webhook: {e}")
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8800)
