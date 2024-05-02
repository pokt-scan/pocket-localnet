FROM node:18.17-alpine

RUN addgroup --gid 1001 -S app \
    && adduser --uid 1005 -S -G app app \
    && mkdir -p /home/app/relayer/logs \
    && mkdir -p /home/app/relayer/data \
    && chown -R app:app /home/app/relayer

WORKDIR /home/app/relayer

COPY . .

RUN yarn install

VOLUME /home/app/relayer

CMD ["yarn", "start:docker"]
