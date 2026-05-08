FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      clamav clamav-freshclam curl && \
    rm -rf /var/lib/apt/lists/* && \
    sed -i 's/^Example/#Example/' /etc/clamav/freshclam.conf && \
    mkdir -p /var/lib/clamav /run/clamav /uploads

WORKDIR /app
RUN npm install -g pompelmi

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3310 8080

ENTRYPOINT ["/entrypoint.sh"]
