import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3 = new S3Client({});
const THUMBNAIL_PREFIX = process.env.THUMBNAIL_PREFIX || "thumbnails/";
const BACKEND_API_URL = process.env.BACKEND_API_URL;
const API_KEY = process.env.API_KEY;
const MAX_DIMENSION = 400;

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".tiff", ".tif", ".bmp", ".avif",
]);

function isImageFile(key) {
  const lower = key.toLowerCase();
  return Array.from(IMAGE_EXTENSIONS).some((ext) => lower.endsWith(ext));
}

/**
 * Extracts the resourceId from an S3 key like "uploads/{resourceId}/{fileName}".
 */
function parseS3Key(key) {
  const parts = key.split("/");
  if (parts.length < 3 || parts[0] !== "uploads") {
    return null;
  }
  return { resourceId: parts[1], fileName: parts.slice(2).join("/") };
}

export async function handler(event) {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing: s3://${bucket}/${key}`);

    // Skip non-image files gracefully
    if (!isImageFile(key)) {
      console.log(`Skipping non-image file: ${key}`);
      continue;
    }

    const parsed = parseS3Key(key);
    if (!parsed) {
      console.log(`Unexpected key format, skipping: ${key}`);
      continue;
    }

    const { resourceId, fileName } = parsed;
    const thumbnailKey = `${THUMBNAIL_PREFIX}${resourceId}/${fileName}`;

    try {
      // Read the original image from S3
      const getResponse = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      const imageBytes = await getResponse.Body.transformToByteArray();

      // Generate a 400x400 max web-optimized thumbnail
      const thumbnail = await sharp(Buffer.from(imageBytes))
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // Store thumbnail under thumbnails/ prefix
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbnail,
          ContentType: "image/webp",
        })
      );

      console.log(`Thumbnail stored: s3://${bucket}/${thumbnailKey}`);

      // Callback to backend API
      if (BACKEND_API_URL && API_KEY) {
        await callbackToBackend(resourceId, thumbnailKey);
      } else {
        console.log("No BACKEND_API_URL or API_KEY configured, skipping callback");
      }
    } catch (err) {
      console.error(`Error processing ${key}:`, err);
      // Non-blocking: resource remains without thumbnail
    }
  }

  return { statusCode: 200, body: "OK" };
}

async function callbackToBackend(resourceId, thumbnailS3Key) {
  const url = `${BACKEND_API_URL}/api/internal/thumbnails`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
      },
      body: JSON.stringify({ resourceId, thumbnailS3Key }),
    });

    if (!response.ok) {
      console.error(`Backend callback failed: ${response.status} ${response.statusText}`);
    } else {
      console.log(`Backend callback succeeded for resource ${resourceId}`);
    }
  } catch (err) {
    console.error(`Backend callback error for resource ${resourceId}:`, err);
  }
}
