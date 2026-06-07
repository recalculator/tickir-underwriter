import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

const S3_BUCKET = process.env.AWS_S3_BUCKET ?? "";
const S3_REGION = process.env.AWS_REGION ?? "us-east-1";
const PRESIGNED_URL_EXPIRES_SECONDS = 3600;
export const LOCAL_UPLOADS_DIR = path.join(process.cwd(), ".local-uploads");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? "documents";

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export function hasSupabaseStorageConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export function hasS3Config(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
  );
}

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

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

export async function generateUploadUrl(s3Key: string, contentType: string): Promise<string | null> {
  if (hasSupabaseStorageConfig()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUploadUrl(s3Key);
    if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);
    return data.signedUrl;
  }
  if (hasS3Config()) {
    return getUploadPresignedUrl(s3Key, contentType);
  }
  return null;
}

export async function deleteFile(s3Key: string): Promise<void> {
  if (hasSupabaseStorageConfig()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([s3Key]);
    if (error) throw new Error(`Supabase Storage delete failed: ${error.message}`);
    return;
  }

  if (hasS3Config()) {
    await deleteS3Object(s3Key);
    return;
  }

  const localPath = path.join(LOCAL_UPLOADS_DIR, s3Key);
  await fs.unlink(localPath).catch(() => {
    // Ignore if file already gone
  });
}

export async function uploadFile(
  s3Key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (hasSupabaseStorageConfig()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(s3Key, body, { contentType, upsert: true });
    if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
    return;
  }

  if (hasS3Config()) {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: contentType,
    });
    await s3Client.send(command);
    return;
  }

  const localPath = path.join(LOCAL_UPLOADS_DIR, s3Key);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, body);
}

export async function downloadFile(s3Key: string): Promise<Buffer> {
  if (hasSupabaseStorageConfig()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .download(s3Key);
    if (error) throw new Error(`Supabase Storage download failed: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  if (hasS3Config()) {
    const { GetObjectCommand: GetCmd } = await import("@aws-sdk/client-s3");
    const command = new GetCmd({ Bucket: S3_BUCKET, Key: s3Key });
    const response = await s3Client.send(command);
    const stream = response.Body as NodeJS.ReadableStream;
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  const localPath = path.join(LOCAL_UPLOADS_DIR, s3Key);
  return fs.readFile(localPath);
}
