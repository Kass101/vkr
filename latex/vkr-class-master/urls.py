from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views
from .views import export_selected_chapters

urlpatterns = [
    path('', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('logout/', views.logout_view, name='logout'),
    path('update_cover/<int:book_id>/', views.update_cover, name='update_cover'),
    path('books/<int:book_id>/delete_cover/', views.delete_cover, name='delete_cover'),
    path('book/<int:book_id>/', views.book_info, name='book_info'),
    path('add-book/', views.add_book, name='add_book'),
    path('add-chapter/<int:arc_id>/', views.add_chapter, name='add_chapter'),
    path('add-arc/<int:book_id>/', views.add_arc, name='add_arc'),
    path('delete-arc/<int:arc_id>/', views.delete_arc, name='delete_arc'),
    path('delete-chapter/<int:chapter_id>/', views.delete_chapter, name='delete_chapter'),
    path('chapter/<int:chapter_id>/', views.chapter_info, name='chapter_info'),
    path('chapter/<int:chapter_id>/save/', views.save_chapter, name='save_chapter'),
    path('export/docx/<int:chapter_id>/', views.export_docx, name='export_docx'),
    path('export-selected-chapters/', export_selected_chapters, name='export_selected_chapters'),
    path('api/ai/chat/', views.ai_chat, name='ai_chat'),
    path('api/get_book_content/', views.get_book_content, name='get_book_content'),
    path('rename-arc/<int:arc_id>/', views.rename_arc, name='rename_arc'),
    path('rename-chapter/<int:chapter_id>/', views.rename_chapter, name='rename_chapter'),
    path('delete-book/<int:book_id>/', views.delete_book, name='delete_book'),
    path('api/upload_file/', views.upload_file, name='upload_file'),
    path('api/import_pages/', views.import_pages, name='import_pages'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
