import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_BASE = process.env.R2_PUBLIC_URL!

/** Generate a presigned PUT URL valid for 5 minutes */
export async function getPresignedPutUrl(key: string, mimeType: string): Promise<string> {
  const client = getClient()
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
  })
  return getSignedUrl(client, command, { expiresIn: 300 })
}

/** Build the public URL for an R2 key */
export function getPublicUrl(key: string): string {
  return `${PUBLIC_BASE.replace(/\/$/, '')}/${key}`
}

/** Delete an object from R2 */
export async function deleteR2Object(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
