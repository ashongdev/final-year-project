from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class GenerateThrottle(AnonRateThrottle):
    """Strict throttle for the certificate generation endpoint — it is CPU-intensive."""
    scope = "generate"
