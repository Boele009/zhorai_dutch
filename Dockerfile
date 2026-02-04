###############################
### PYTHON: SEMANTIC-PARSER ###
###############################
FROM ubuntu:25.10

ENV DEBIAN_FRONTEND=noninteractive
SHELL ["/bin/bash", "-euxo", "pipefail", "-c"]

WORKDIR /usr/src/semantic-parser

# System deps (install once, clean once)
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg \
    python3 python3-venv python3-pip python3-dev \
    libmysqlclient-dev \
    unzip \
    libxml2-dev libxslt-dev \
    # Java 8 is available in 25.10 repos, so no PPA needed
    openjdk-8-jdk openjdk-8-jre \
    coq \
  && rm -rf /var/lib/apt/lists/*

# Make "python" point to python3 (don’t hardcode /usr/bin/python3.13)
RUN ln -sf /usr/bin/python3 /usr/bin/python && python -V

# Copy code
RUN mkdir -p ./ccg2lambda
COPY ./semantic-parser/ccg2lambda /usr/src/semantic-parser/ccg2lambda
COPY ./word-similarity /usr/src/word-similarity

# Create and use a venv to avoid PEP 668 issues
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip inside venv + install python libs
RUN python -m pip install --upgrade pip
RUN python -m pip install --no-cache-dir --upgrade "nltk>=3.8"
# create NLTK data dir and download needed corpora into it
RUN mkdir -p /usr/local/share/nltk_data && \
    python -m nltk.downloader -d /usr/local/share/nltk_data punkt wordnet omw-1.4
ENV NLTK_DATA="/usr/local/share/nltk_data"
RUN pip install --no-cache-dir lxml simplejson pyyaml

## test ccg2lambda
RUN cd ccg2lambda && python scripts/run_tests.py || true

## compile the coq library
RUN cd ccg2lambda && coqc coqlib.v && cd ..

## install c&c parser -- this may fail...
RUN ccg2lambda/en/install_candc.sh || true
RUN echo "/path/to/candc-1.00/" > ccg2lambda/en/candc_location.txt


########################
### NODE.JS RECEIVER ###
########################
WORKDIR /usr/src/website-backend/receive-text

# Node 10 is EOL; use a supported LTS (20 shown here)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

COPY ./website-backend/receive-text/package*.json /usr/src/website-backend/receive-text/
RUN npm ci

COPY ./website-backend/receive-text /usr/src/website-backend/receive-text

COPY receiver_parser_setup.sh /usr/src/receiver_parser_setup.sh
RUN chmod +x /usr/src/receiver_parser_setup.sh

# COPY . .

EXPOSE 5000
