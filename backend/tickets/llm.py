"""
LLM classification service.

Uses Anthropic Claude by default (configurable via LLM_PROVIDER env var).
Designed for graceful degradation — if the LLM call fails for any reason
the caller receives None values, not an exception.

Prompt design rationale:
  - Structured output (JSON) is requested explicitly so we can parse reliably.
  - A concise list of valid values is provided in the prompt so the model
    never has to guess what is acceptable.
  - The instruction to "respond ONLY with valid JSON" discourages the model
    from adding prose explanations that would break parsing.
  - We include a concrete output example so the model can match the exact
    shape expected.
"""

import json
import logging
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Prompt                                                                       #
# --------------------------------------------------------------------------- #

SYSTEM_PROMPT = """You are a support ticket triage assistant.
Given a support ticket description, classify it into exactly one category
and assign a priority level.

Valid categories:
  - billing   (payment issues, invoices, refunds, subscriptions)
  - technical (bugs, errors, performance, integrations, API)
  - account   (login, password, permissions, profile)
  - general   (anything that doesn't fit the above)

Valid priorities:
  - low      (minor inconvenience, no business impact)
  - medium   (moderate impact, workaround exists)
  - high     (significant impact, no easy workaround)
  - critical (service down, data loss, severe business impact)

Respond ONLY with a valid JSON object — no markdown, no explanation:
{"category": "<category>", "priority": "<priority>"}"""

USER_PROMPT_TEMPLATE = "Ticket description:\n\n{description}"


# --------------------------------------------------------------------------- #
# Provider implementations                                                     #
# --------------------------------------------------------------------------- #

def _classify_with_anthropic(description: str) -> dict:
    """Call Anthropic Claude to classify a ticket description."""
    import anthropic  # lazy import — only needed if this provider is active

    client = anthropic.Anthropic(api_key=settings.LLM_API_KEY)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=64,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": USER_PROMPT_TEMPLATE.format(description=description[:2000]),
            }
        ],
    )
    raw = message.content[0].text.strip()
    return json.loads(raw)


def _classify_with_openai(description: str) -> dict:
    """Call OpenAI to classify a ticket description."""
    import openai  # lazy import

    client = openai.OpenAI(api_key=settings.LLM_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=64,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": USER_PROMPT_TEMPLATE.format(description=description[:2000]),
            },
        ],
    )
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


_PROVIDERS = {
    "anthropic": _classify_with_anthropic,
    "openai": _classify_with_openai,
}


# --------------------------------------------------------------------------- #
# Public interface                                                              #
# --------------------------------------------------------------------------- #

VALID_CATEGORIES = {"billing", "technical", "account", "general"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}


def classify_ticket(description: str) -> dict[str, Optional[str]]:
    """
    Return suggested category and priority for *description*.

    Always returns a dict with keys ``suggested_category`` and
    ``suggested_priority``. Values are ``None`` when classification fails
    so the frontend can treat missing suggestions gracefully.
    """
    fallback = {"suggested_category": None, "suggested_priority": None}

    if not settings.LLM_API_KEY:
        logger.warning("LLM_API_KEY not configured — skipping classification.")
        return fallback

    provider_name = getattr(settings, "LLM_PROVIDER", "anthropic")
    classify_fn = _PROVIDERS.get(provider_name)

    if classify_fn is None:
        logger.error("Unknown LLM_PROVIDER '%s'. Falling back.", provider_name)
        return fallback

    try:
        result = classify_fn(description)
        category = result.get("category", "").lower().strip()
        priority = result.get("priority", "").lower().strip()

        return {
            "suggested_category": category if category in VALID_CATEGORIES else None,
            "suggested_priority": priority if priority in VALID_PRIORITIES else None,
        }
    except json.JSONDecodeError:
        logger.exception("LLM returned non-JSON response.")
    except Exception:
        logger.exception("LLM classification failed.")

    return fallback
