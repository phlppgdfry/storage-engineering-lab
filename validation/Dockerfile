FROM node:24.21.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git python3 make g++ libattr1-dev && rm -rf /var/lib/apt/lists/*
RUN npm install --global npm@11.12.1 && git config --global url.https://github.com/.insteadOf ssh://git@github.com/
WORKDIR /workspace/storage
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN cp .env.sample .env && cp .env.test.sample .env.test && mkdir -p data
LABEL storage.lab.source="3bbc971796fe9907a030c4fc70a07d440930d7b2"
