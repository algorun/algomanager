FROM ahosny/python
LABEL maintainer "abdelrahman.hosny@hotmail.com"

ENV PYTHONUNBUFFERED 1

RUN mkdir /app
WORKDIR /app

ADD requirements.txt /app/
RUN pip install -r requirements.txt

EXPOSE 8000
ENTRYPOINT ["/app/initialize.sh"]