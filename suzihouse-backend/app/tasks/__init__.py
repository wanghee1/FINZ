"""
Shared Celery application instance.

All task modules should import ``celery_app`` from here::

    from app.tasks import celery_app

    @celery_app.task
    def my_task():
        ...
"""

from celery import Celery

celery_app = Celery("suzihouse")

try:
    from app.config import settings

    celery_app.conf.broker_url = settings.CELERY_BROKER_URL
    celery_app.conf.result_backend = settings.CELERY_RESULT_BACKEND
    celery_app.conf.task_serializer = "json"
    celery_app.conf.result_serializer = "json"
    celery_app.conf.accept_content = ["json"]
    celery_app.conf.timezone = "Asia/Seoul"
except Exception:
    # Configuration may be unavailable during testing or when Celery
    # dependencies are not installed.  Fall back to defaults silently.
    pass
