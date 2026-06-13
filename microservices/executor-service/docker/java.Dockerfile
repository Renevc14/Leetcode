FROM eclipse-temurin:21-jdk-jammy

RUN groupadd -r runner && useradd -r -g runner -u 1000 runner

WORKDIR /work
RUN chown runner:runner /work

USER runner
