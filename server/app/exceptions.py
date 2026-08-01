import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("app")


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        view = context.get("view")
        view_name = type(view).__name__ if view else "unknown"
        logger.warning(
            "API error in %s: %s %s",
            view_name,
            response.status_code,
            response.data,
        )
        response.data = {
            "error": _flatten_errors(response.data),
            "status": response.status_code,
        }

    return response


def _flatten_errors(data):
    if isinstance(data, list):
        return " ".join(str(e) for e in data)
    if isinstance(data, dict):
        parts = []
        for v in data.values():
            parts.append(_flatten_errors(v))
        return " ".join(parts)
    return str(data)
