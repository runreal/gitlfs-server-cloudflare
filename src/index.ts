import { Hono } from "hono";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import { batchRequestSchema, batchResponseSchema } from "./schema";
import { getS3Client } from "./r2";

export type Bindings = {
  OBJECT_STORE: KVNamespace;
  LFS_BUCKET: R2Bucket;
  BUCKET_NAME: string;
  ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID:string;
  R2_SECRET_ACCESS_KEY:string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post("/:user/:repo/objects/batch", async (c) => {

  const body = await c.req.json();
  const request = batchRequestSchema.parse(body);

  const key = `${c.req.param("user")}/${c.req.param("repo")}`;
  const r2 =  getS3Client(c);

  const response = batchResponseSchema.parse({});
  if (request.operation === "upload") {
    for (const obj of request.objects) {
      const url = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: c.env.BUCKET_NAME,
          Key: `${key}/${obj.oid}`,
          ContentLength: obj.size,
        }),
        { expiresIn: 3600 },
      );

      response.objects.push({
        oid: obj.oid,
        size: obj.size,
        actions: {
          upload: {
            href: url,
            expires_in: 3600,
          },
        },
      });
    }
  }
  if (request.operation === "download") {
    for (const obj of request.objects) {
      const url = await getSignedUrl(
        r2,
        new GetObjectCommand({
          Bucket: c.env.BUCKET_NAME,
          Key: `${key}/${obj.oid}`,
        }),
        { expiresIn: 3600 },
      );

      response.objects.push({
        oid: obj.oid,
        size: obj.size,
        actions: {
          download: {
            href: url,
            expires_in: 3600,
          },
        },
      });
    }
  }

  return c.json(response, 200, {
      "Content-Type": "application/vnd.git-lfs+json",
  });
});

app.post("/verify/:oid", (c) => {
  return c.text("TODO");
});

export default app;
