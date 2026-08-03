from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BlueprintViewSet, SectionViewSet, VersionViewSet, ExportViewSet

router = DefaultRouter()
router.register(r'blueprints', BlueprintViewSet, basename='blueprint')
router.register(r'sections', SectionViewSet, basename='section')
router.register(r'versions', VersionViewSet, basename='version')
router.register(r'exports', ExportViewSet, basename='export')

urlpatterns = [
    path('', include(router.urls)),
]
