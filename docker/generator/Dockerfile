FROM python:3.13-alpine3.20
RUN addgroup -S app \
    && adduser -S -G app app
WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
COPY config ./config
COPY bin ./bin
USER app
ENV PYTHONPATH=/app/src/python
ENTRYPOINT ["python","-m","canarias_route_matrix.cli"]
