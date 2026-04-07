import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type AnalysisArchivePayload = {
  conversationId: string;
  sourceType: string;
  riskLevel: string;
  violenceScore: number;
  anonymizedContent: string;
  createdAt: string;
};

let s3Client: S3Client | null = null;

function getAwsS3BucketName(): string {
  return process.env.AWS_S3_BUCKET_ANALYSIS ?? "";
}

function isAwsConfigured(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      getAwsS3BucketName()
  );
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const forcePathStyle =
    process.env.AWS_S3_FORCE_PATH_STYLE?.toLowerCase() === "true";

  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
    forcePathStyle,
  });

  return s3Client;
}

export function isAwsArchiveEnabled(): boolean {
  return isAwsConfigured();
}

export async function archiveAnalysisToS3(
  payload: AnalysisArchivePayload
): Promise<string | null> {
  if (!isAwsConfigured()) return null;

  const bucket = getAwsS3BucketName();
  const key = `analyses/${new Date().toISOString().slice(0, 10)}/${payload.conversationId}.json`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(payload),
    ContentType: "application/json",
  });

  await getS3Client().send(command);
  return key;
}
