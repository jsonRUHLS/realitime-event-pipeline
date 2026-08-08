FROM mongo:8

RUN head -c 756 /dev/urandom \
    | base64 \
    | tr -d '\n' \
    > /etc/mongodb-keyfile \
    && chown mongodb:mongodb /etc/mongodb-keyfile \
    && chmod 400 /etc/mongodb-keyfile