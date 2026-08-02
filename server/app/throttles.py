from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class GenerateThrottle(AnonRateThrottle):
    """Strict throttle for the certificate generation endpoint — it is CPU-intensive.

    A request with purpose="live" (the editor's background auto-refresh,
    used to keep the canvas showing the real render while idle) is switched
    to the much more permissive "live_preview" scope instead, so those
    frequent background pings can't burn through the budget meant for real
    downloads/generates and the explicit Preview button.
    """
    scope = "generate"

    def allow_request(self, request, view):
        if request.data.get("purpose") == "live":
            self.scope = "live_preview"
            self.rate = self.get_rate()
            self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)


class VerificationThrottle(AnonRateThrottle):
    """Throttle for recipient email verification — limits code-request/guess spam."""
    scope = "verification"
