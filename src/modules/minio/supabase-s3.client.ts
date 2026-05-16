import * as fs from 'fs';
import * as crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface SupabaseS3ClientOptions {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  portValue?: string;
  useSslValue?: string;
}

export interface S3FileInfo {
  fileName: string;
  size: number;
  etag: string;
  lastModified: Date;
}

export interface S3FileStat {
  size: number;
  etag: string;
  lastModified: Date;
}

function toAmzDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function toDateStamp(date: Date) {
  return toAmzDate(date).slice(0, 8);
}

function sha256Hex(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function getSigningKey(secretAccessKey: string, dateStamp: string, region: string) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment).replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildCanonicalPath(pathname: string) {
  return pathname
    .split('/')
    .map((segment, index) => (index === 0 ? '' : encodePathSegment(segment)))
    .join('/');
}

function buildQueryString(searchParams: URLSearchParams) {
  return [...searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }
      return leftKey.localeCompare(rightKey);
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function extractErrorCode(body: string) {
  const codeMatch = body.match(/<Code>([^<]+)<\/Code>/i);
  return codeMatch?.[1];
}

function normalizeEndpoint(
  endpoint: string,
  portValue?: string,
  useSslValue?: string,
): URL {
  if (/^https?:\/\//i.test(endpoint)) {
    const url = new URL(endpoint);
    if (
      url.hostname.includes('storage.supabase.co') &&
      (url.pathname === '/' || url.pathname === '')
    ) {
      url.pathname = '/storage/v1/s3';
    }
    return url;
  }

  const useSSL = useSslValue === 'true' || useSslValue === '1';
  const url = new URL(`${useSSL ? 'https' : 'http'}://${endpoint}`);

  if (url.hostname.includes('storage.supabase.co')) {
    url.pathname = '/storage/v1/s3';
  } else if (portValue) {
    url.port = portValue;
  }

  return url;
}

export class SupabaseS3Client {
  private readonly baseUrl: URL;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(options: SupabaseS3ClientOptions) {
    this.baseUrl = normalizeEndpoint(options.endpoint, options.portValue, options.useSslValue);
    this.region = options.region;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
  }

  private buildUrl(bucketName?: string, objectKey?: string, query?: string) {
    const url = new URL(this.baseUrl.toString());
    const pathSegments = url.pathname.split('/').filter(Boolean);

    if (bucketName) {
      pathSegments.push(bucketName);
    }

    if (objectKey) {
      pathSegments.push(...objectKey.split('/'));
    }

    url.pathname = `/${pathSegments.map(encodePathSegment).join('/')}`;
    if (query) {
      url.search = query;
    }

    return url;
  }

  private async signedRequest(options: {
    method: string;
    bucketName?: string;
    objectKey?: string;
    queryParams?: URLSearchParams;
    headers?: Record<string, string>;
    body?: BodyInit | null;
    payloadHash?: string;
  }) {
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = toDateStamp(now);
    const queryParams = options.queryParams ?? new URLSearchParams();
    const url = this.buildUrl(options.bucketName, options.objectKey, buildQueryString(queryParams));
    const payloadHash = options.payloadHash ?? sha256Hex('');

    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      ...(options.headers ?? {}),
    };

    const signedHeaderNames = Object.keys(headers)
      .map((key) => key.toLowerCase())
      .sort();

    const canonicalHeaders = signedHeaderNames
      .map((key) => `${key}:${String(headers[key]).trim().replace(/\s+/g, ' ')}`)
      .join('\n');

    const canonicalRequest = [
      options.method.toUpperCase(),
      buildCanonicalPath(url.pathname),
      buildQueryString(new URLSearchParams(url.search)),
      `${canonicalHeaders}\n`,
      signedHeaderNames.join(';'),
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = getSigningKey(this.secretAccessKey, dateStamp, this.region);
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    headers.authorization = [
      `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaderNames.join(';')}`,
      `Signature=${signature}`,
    ].join(', ');

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ?? undefined,
      // Node requires duplex when streaming request bodies.
      duplex: options.body instanceof Readable ? 'half' : undefined,
    } as RequestInit & { duplex?: 'half' });

    return response;
  }

  async bucketExists(bucketName: string): Promise<boolean> {
    const response = await this.signedRequest({
      method: 'HEAD',
      bucketName,
    });

    if (response.ok) {
      return true;
    }

    if (response.status === 404) {
      return false;
    }

    const errorBody = await response.text();
    const error = new Error(errorBody || `Failed to check bucket ${bucketName}`);
    (error as Error & { code?: string }).code = extractErrorCode(errorBody);
    throw error;
  }

  async createBucket(bucketName: string): Promise<void> {
    const response = await this.signedRequest({
      method: 'PUT',
      bucketName,
      payloadHash: sha256Hex(''),
    });

    if (response.ok) {
      return;
    }

    const errorBody = await response.text();
    const error = new Error(errorBody || `Failed to create bucket ${bucketName}`);
    (error as Error & { code?: string }).code = extractErrorCode(errorBody);
    (error as Error & { statusCode?: number }).statusCode = response.status;
    throw error;
  }

  async putObject(bucketName: string, objectKey: string, filePath: string): Promise<void> {
    const fileStats = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    const response = await this.signedRequest({
      method: 'PUT',
      bucketName,
      objectKey,
      headers: {
        'content-length': String(fileStats.size),
      },
      body: fileStream as unknown as BodyInit,
      payloadHash: 'UNSIGNED-PAYLOAD',
    });

    if (response.ok) {
      return;
    }

    const errorBody = await response.text();
    const error = new Error(errorBody || `Failed to upload ${objectKey}`);
    (error as Error & { code?: string }).code = extractErrorCode(errorBody);
    (error as Error & { statusCode?: number }).statusCode = response.status;
    throw error;
  }

  async downloadObject(bucketName: string, objectKey: string, destinationPath: string): Promise<void> {
    const response = await this.signedRequest({
      method: 'GET',
      bucketName,
      objectKey,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(errorBody || `Failed to download ${objectKey}`);
      (error as Error & { code?: string }).code = extractErrorCode(errorBody);
      (error as Error & { statusCode?: number }).statusCode = response.status;
      throw error;
    }

    if (!response.body) {
      throw new Error('Empty download response body');
    }

    await pipeline(Readable.fromWeb(response.body as any), fs.createWriteStream(destinationPath));
  }

  async deleteObject(bucketName: string, objectKey: string): Promise<void> {
    const response = await this.signedRequest({
      method: 'DELETE',
      bucketName,
      objectKey,
    });

    if (response.ok) {
      return;
    }

    const errorBody = await response.text();
    const error = new Error(errorBody || `Failed to delete ${objectKey}`);
    (error as Error & { code?: string }).code = extractErrorCode(errorBody);
    (error as Error & { statusCode?: number }).statusCode = response.status;
    throw error;
  }

  async listObjects(bucketName: string): Promise<S3FileInfo[]> {
    const queryParams = new URLSearchParams({
      'list-type': '2',
      prefix: '',
    });

    const response = await this.signedRequest({
      method: 'GET',
      bucketName,
      queryParams,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(errorBody || `Failed to list objects in ${bucketName}`);
      (error as Error & { code?: string }).code = extractErrorCode(errorBody);
      (error as Error & { statusCode?: number }).statusCode = response.status;
      throw error;
    }

    const xml = await response.text();
    const contents = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((match) => match[1]);

    return contents
      .map((block) => {
        const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
        if (!key) {
          return null;
        }

        const size = Number(block.match(/<Size>([\s\S]*?)<\/Size>/)?.[1] ?? '0');
        const etag = (block.match(/<ETag>([\s\S]*?)<\/ETag>/)?.[1] ?? '').replaceAll('"', '');
        const lastModifiedRaw = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];

        return {
          fileName: key,
          size,
          etag,
          lastModified: lastModifiedRaw ? new Date(lastModifiedRaw) : new Date(0),
        } satisfies S3FileInfo;
      })
      .filter((item): item is S3FileInfo => item !== null);
  }

  async headObject(bucketName: string, objectKey: string): Promise<S3FileStat> {
    const response = await this.signedRequest({
      method: 'HEAD',
      bucketName,
      objectKey,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(errorBody || `Failed to inspect ${objectKey}`);
      (error as Error & { code?: string }).code = extractErrorCode(errorBody);
      (error as Error & { statusCode?: number }).statusCode = response.status;
      throw error;
    }

    return {
      size: Number(response.headers.get('content-length') ?? '0'),
      etag: (response.headers.get('etag') ?? '').replaceAll('"', ''),
      lastModified: response.headers.get('last-modified') ? new Date(response.headers.get('last-modified') as string) : new Date(0),
    };
  }

  getSignedObjectUrl(bucketName: string, objectKey: string, expiresInSeconds: number): string {
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = toDateStamp(now);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const signingKey = getSigningKey(this.secretAccessKey, dateStamp, this.region);

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresInSeconds),
      'X-Amz-SignedHeaders': 'host',
      'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    });

    const url = this.buildUrl(bucketName, objectKey, buildQueryString(queryParams));
    const canonicalRequest = [
      'GET',
      buildCanonicalPath(url.pathname),
      buildQueryString(new URLSearchParams(url.search)),
      `host:${url.host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    url.searchParams.set('X-Amz-Signature', signature);
    return url.toString();
  }
}