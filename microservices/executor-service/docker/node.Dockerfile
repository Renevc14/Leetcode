FROM node:22-slim

RUN npm install -g typescript@5 --quiet

# node:22-slim already ships with a 'node' user at uid/gid 1000
WORKDIR /work
RUN chown node:node /work

USER node
