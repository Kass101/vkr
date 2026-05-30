from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

class Book(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title_book = models.CharField(max_length=200)
    size = models.CharField(max_length=50, blank=True)
    # page_count = models.IntegerField(default=0)  # Удалите или закомментируйте эту строку
    chapter_count = models.IntegerField(default=0)
    status = models.CharField(max_length=50, default='draft')
    cover_path = models.ImageField(upload_to='covers/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title_book

class Arc(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='arcs')
    title_arc = models.CharField(max_length=200)
    arc_number = models.IntegerField(default=1)

    def __str__(self):
        return self.title_arc

class Chapter(models.Model):
    arc = models.ForeignKey(Arc, on_delete=models.CASCADE, related_name='chapters')
    title_chapter = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    chapter_number = models.IntegerField(default=1)

    def __str__(self):
        return self.title_chapter

class ChapterVersion(models.Model):
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='versions')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Version of {self.chapter.title_chapter} at {self.created_at}"

def update_chapter_count(book):
    total_chapters = 0
    for arc in book.arcs.all():
        total_chapters += arc.chapters.count()
    book.chapter_count = total_chapters
    book.save()

@receiver(post_save, sender=Chapter)
def chapter_created_or_updated(sender, instance, **kwargs):
    update_chapter_count(instance.arc.book)

@receiver(post_delete, sender=Chapter)
def chapter_deleted(sender, instance, **kwargs):
    update_chapter_count(instance.arc.book)