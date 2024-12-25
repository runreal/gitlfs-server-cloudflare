import { Hono } from "hono";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import {
	batchRequestSchema,
	batchResponseSchema,
	createLockRequestSchema,
	createLockResponseSchema,
	lockListResponseSchema,
} from "./schema";
import { getS3Client } from "./r2";
import type { Lock } from "./lock";

export type Bindings = {
	OBJECT_STORE: KVNamespace;
	LFS_BUCKET: R2Bucket;
	LOCK: DurableObjectNamespace<Lock>;
	BUCKET_NAME: string;
	ACCOUNT_ID: string;
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post("/:user/:repo/objects/batch", async (c) => {
	const body = await c.req.json();
	const request = batchRequestSchema.parse(body);

	const key = `${c.req.param("user")}/${c.req.param("repo")}`;
	const r2 = getS3Client(c);

	const response = batchResponseSchema.parse({
		transfer: "basic",
		objects: [],
	});

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
			let objKey = `${key}/${obj.oid}`;

			let objectHeadReq = await r2
				.send(
					new HeadObjectCommand({
						Bucket: c.env.BUCKET_NAME,
						Key: objKey,
					}),
				)
				.catch(() => ({}));
			let size = objectHeadReq.ContentLength;

			if (!size) {
				response.objects.push({
					oid: obj.oid,
					size: obj.size,
					error: {
						code: 404,
						message: "object not found",
					},
				});

				continue;
			}

			const url = await getSignedUrl(
				r2,
				new GetObjectCommand({
					Bucket: c.env.BUCKET_NAME,
					Key: objKey,
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

app.post("/org/:repo/objects/verify", async (c) => {
	const body = await c.req.json();
	console.log(body);
});

app.post("/:org/:repo/locks/verify", async (c) => {
	console.log(c.req.header());
});

// Lock
app.post("/:org/:repo/locks", async (c) => {
	const body = await c.req.json();
	console.log(body);
	const info = createLockRequestSchema.parse(body);

	const key = `${c.req.param("org")}:${c.req.param("repo")}`;

	const exist = await c.env.OBJECT_STORE.get(`${key}:${info.path}`);

	if (exist) {
		return c.json(
			{
				message: "already created lock",
			},
			409,
			{
				"Content-Type": "application/vnd.git-lfs+json",
			},
		);
	}

	const name = `${c.req.param("org")}/${c.req.param("repo")}/${info.path}`;

	const lockId = c.env.LOCK.idFromName(name);

	const lock = c.env.LOCK.get(lockId);
	const locked_at = await lock.lock({ path: info.path });

	await c.env.OBJECT_STORE.put(`${key}:${info.path}`, `${lockId.toString()}`);

	const result = createLockResponseSchema.parse({
		lock: {
			id: lockId.toString(),
			path: info.path,
			locked_at,
		},
	});
	return c.json(result, 200);
});

// Unlock

app.post("/:org/:repo/locks/:id/unlock", async (c) => {
	const key = `${c.req.param("org")}:${c.req.param("repo")}`;
	const lockId = c.req.param("id");
	const id = c.env.LOCK.idFromString(lockId);
	const lock = c.env.LOCK.get(id);

	const { path, locked_at } = await lock.get();

	await lock.unlock();

	await c.env.OBJECT_STORE.delete(`${key}:${path}`);

	const result = createLockResponseSchema.parse({
		lock: {
			id: lockId.toString(),
			path: path,
			locked_at,
		},
	});

	return c.json(result, 200);
});

app.get("/:org/:repo/locks", async (c) => {
	// TODO We should handle them
	const path = c.req.query("path");
	const id = c.req.query("id");
	const cursor = c.req.query("cursor");
	const limit = c.req.query("limit");
	const refspec = c.req.query("refspec");

	const key = path
		? `${c.req.param("org")}:${c.req.param("repo")}:${path}`
		: `${c.req.param("org")}:${c.req.param("repo")}`;

	const locks = await c.env.OBJECT_STORE.list({ prefix: key });

	const response = lockListResponseSchema.parse({
		locks: [],
	});

	for (const lock of locks.keys) {
		console.log(lock);

		const data = await c.env.OBJECT_STORE.get(lock.name);
		if (!data) continue;
		response.locks.push({
			id: data,
		});
	}

	return c.json(response, 200, {
		"Content-Type": "application/vnd.git-lfs+json",
	});
});

app.post("/verify/:oid", (c) => {
	return c.text("TODO");
});

export * from "./lock";
export default app;
