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

# Install pompelmi from npm
RUN npm install pompelmi

# Action scripts (paths relative to repo root — GitHub sets build context to repo root)
COPY action/entrypoint.sh ./entrypoint.sh
COPY action/scanner.js    ./scanner.js
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/action/entrypoint.sh"]
