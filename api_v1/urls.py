from django.conf.urls import url

from . import views
from algorun import startup

urlpatterns = [
    url(r'^api/v1/list', views.list, name='list'),
    url(r'^api/v1/deploy', views.deploy, name='deploy'),
    url(r'^', views.home, name='home'),
]


startup()