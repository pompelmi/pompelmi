'use strict';

const { scanStream } = require('./ClamAVScanner.js');
const { Readable }   = require('stream');

/**
 * Scan an S3 object by streaming it directly to clamd — no disk I/O.
 *
 * Requires @aws-sdk/client-s3: npm install @aws-sdk/client-s3
 *
 * @param {{ bucket: string, key: string, region?: string, credentials?: object }} s3Params
 * @param {object} [options] - Same options as scanStream (host, port, socket, timeout, retries, retryDelay)
 * @returns {Promise<symbol>}
 */
async function scanS3({ bucket, key, region, credentials } = {}, options = {}) {
    let S3Client, GetObjectCommand;
    try {
        ({ S3Client, GetObjectCommand } = require('@aws-sdk/client-s3'));
    } catch {
        throw new Error('Install AWS SDK: npm install @aws-sdk/client-s3');
    }

    const clientOpts = {};
    if (region)      clientOpts.region      = region;
    if (credentials) clientOpts.credentials = credentials;

    const client   = new S3Client(clientOpts);
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    const body = response.Body;
    const stream = body instanceof Readable
        ? body
        : (Readable.fromWeb ? Readable.fromWeb(body) : body);

    return scanStream(stream, options);
}

module.exports = { scanS3 };
