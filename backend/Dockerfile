FROM tiangolo/uwsgi-nginx-flask:python3.8-alpine

# RUN apk --update add bash nano
# ENV STATIC_URL /static
# ENV STATIC_PATH /var/www/app/static

WORKDIR /app
ADD . /app
RUN pip install --upgrade pip pipenv
RUN pipenv lock -r > requirements.txt
RUN pip install -r requirements.txt
