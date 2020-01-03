FROM node:12

RUN apt-get update && \
    apt-get -y install xvfb gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
      libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
      libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
      libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
      libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget vim\
        && apt-get -y install tzdata \
        && cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
    && rm -rf /var/lib/apt/lists/*

ENV             WORKDIR /app/daou-works
ENV             TZ=Asia/Seoul
WORKDIR         $WORKDIR

COPY            ./ $WORKDIR/

RUN             npm install

#RUN             node holiday-init.js

RUN             echo $'\n\n\
====================================================================================================\n\
1) docker run \n\
docker run --name works -itd works /bin/bash \n\
2) docker exec \n\
docker exec -it works /bin/bash \n\
3) Initialize Holiday information json \n\
node holiday-init.js \n\
4) Run customized cronjob \n\
node cronjob.js & \n\
====================================================================================================\n\
>>>>> FOR MORE : README.md \n\
====================================================================================================\n\
\n\n'
