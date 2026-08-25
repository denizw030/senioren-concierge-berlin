from .providers import ProviderRateLimited, ProviderUnavailable

def raise_for_provider_status(status_code: int, retry_after_seconds: int | None = None):
    if status_code == 429:
        suffix = f'; retry_after={retry_after_seconds}s' if retry_after_seconds is not None else ''
        raise ProviderRateLimited(f'provider_rate_limited{suffix}')
    if 500 <= status_code <= 599:
        raise ProviderUnavailable(f'provider_unavailable_http_{status_code}')
