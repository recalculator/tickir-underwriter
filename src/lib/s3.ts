import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_BUCKET = process.env.AWS_S3_BUCKET ?? "";
const S3_REGION = process.env.AWS_REGION ?? "us-east-1";
const PRESIGNED_URL_EXPIRES_SECONDS = 3600;

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export function buildS3Key(bankId: string, dealId: string, filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `banks/${bankId}/deals/${dealId}/documents/${Date.now()}_${sanitized}`;
}

export async function getUploadPresignedUrl(
  s3Key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRES_SECONDS,
  });
}

export async function getDownloadPresignedUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRES_SECONDS,
  });
}

export async function deleteS3Object(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  await s3Client.send(command);
}
