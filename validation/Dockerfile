FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git python3 make g++ libattr1-dev && rm -rf /var/lib/apt/lists/*
RUN npm install --global npm@11.12.1 && git config --global url.https://github.com/.insteadOf ssh://git@github.com/
WORKDIR /workspace/storage
COPY package.json package-lock.json ./
# Fetch locked dependencies without executing third-party lifecycle scripts online.
RUN npm ci --ignore-scripts --no-audit --no-fund
ENV npm_config_nodedir=/usr/local
RUN --network=none npm rebuild
COPY . .
RUN cp .env.sample .env && cp .env.test.sample .env.test && mkdir -p data
LABEL storage.lab.source="3bbc971796fe9907a030c4fc70a07d440930d7b2"
