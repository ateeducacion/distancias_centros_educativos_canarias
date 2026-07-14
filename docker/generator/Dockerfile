FROM python:3.13-alpine3.20
RUN apk add --no-cache zstd \
    && apk add --no-cache --virtual .build-deps build-base cargo \
    && cargo install zeekstd_cli --version 0.4.5 --locked \
    && cp /root/.cargo/bin/zeekstd /usr/local/bin/zeekstd \
    && rm -rf /root/.cargo \
    && apk del .build-deps
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
COPY config ./config
COPY bin ./bin
USER app
ENV PYTHONPATH=/app/src/python
ENTRYPOINT ["python","-m","canarias_route_matrix.cli"]
