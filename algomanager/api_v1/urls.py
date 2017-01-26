from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^list$', views.list, name='list'),
    url(r'^deploy', views.deploy, name='deploy'),
]