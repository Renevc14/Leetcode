FROM gcc:13

RUN groupadd -r runner && useradd -r -g runner -u 1000 runner

WORKDIR /work
RUN chown runner:runner /work

USER runner
