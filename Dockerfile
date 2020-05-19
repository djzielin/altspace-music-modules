FROM node:8.12.0-alpine

WORKDIR /opt/app

ENV PORT=80
ENV BASE_URL=http://altspace-theremin.fr.openode.io

# daemon for cron jobs
RUN echo 'crond' > /boot.sh
# RUN echo 'crontab .openode.cron' >> /boot.sh

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)

COPY package*.json ./

RUN npm --add-python-to-path='true' install --production

# Bundle app source
COPY . .

CMD sh /boot.sh && npm start