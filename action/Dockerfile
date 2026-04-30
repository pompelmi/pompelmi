FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends clamav clamav-freshclam && \
    rm -rf /var/lib/apt/lists/* && \
    sed -i 's/^Example/#Example/' /etc/clamav/freshclam.conf && \
    mkdir -p /var/lib/clamav /run/clamav

WORKDIR /action

# These files live in action/ — same folder as this Dockerfile
COPY entrypoint.sh ./entrypoint.sh
COPY scanner.js ./scanner.js

# Install pompelmi from npm — do NOT copy local src/
RUN npm install pompelmi

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/action/entrypoint.sh"]
