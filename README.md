# 출퇴근 자동 관리
# - 주말 및 공휴일 제외

# check before build
> .env 프라퍼티 확인(API키, 계정ID, 계정PW)
> .env 프라퍼티 NODE_ENV값 확인(개발or운영)

# build docker image
> ./docker-build.sh

# run image, configurate timezone(linux)
> docker run --name works -itd works /bin/bash

# execute container by docker image name
> docker exec -it works /bin/bash

# script for app in container
> node holiday-init.js
> node cronjob.js & 