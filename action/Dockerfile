FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        clamav \
        clamav-freshclam \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i 's/^Example/#Example/' /etc/clamav/freshclam.conf \
    && mkdir -p /var/lib/clamav /run/clamav

WORKDIR /action

# Bundle the pompelmi library from this repository
COPY src/ ./src/
COPY package.json ./

# Action scripts
COPY action/entrypoint.sh ./entrypoint.sh
COPY action/scanner.js    ./scanner.js
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/action/entrypoint.sh"]
