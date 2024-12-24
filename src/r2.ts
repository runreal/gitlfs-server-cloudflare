import { S3Client } from "@aws-sdk/client-s3";
import type { Context } from "hono";
import type { Bindings } from ".";

export const getS3Client = (c: Context<{ Bindings: Bindings }>) => {
	const s3Client = new S3Client({
		region: "auto",
		endpoint: `https://${c.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: c.env.R2_ACCESS_KEY_ID,
			secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
		},
	});
	return s3Client;
};
