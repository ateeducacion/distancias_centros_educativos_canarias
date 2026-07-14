FROM rust:1.85-alpine3.20 AS zeekstd-builder
RUN apk add --no-cache musl-dev \
    && cargo install zeekstd_cli --version 0.4.5 --locked

FROM python:3.13-alpine3.20
RUN apk add --no-cache zstd \
    && addgroup -S app \
    && adduser -S -G app app
COPY --from=zeekstd-builder /usr/local/cargo/bin/zeekstd /usr/local/bin/zeekstd
WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
COPY config ./config
COPY bin ./bin
USER app
ENV PYTHONPATH=/app/src/python
ENTRYPOINT ["python","-m","canarias_route_matrix.cli"]
