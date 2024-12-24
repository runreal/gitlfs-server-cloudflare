import { z } from "zod";

export const batchRequestSchema = z.object({
	operation: z.enum(["upload", "download"]),
	ref: z.object({ name: z.string() }).optional(),
	transfers: z.array(z.string()),
	objects: z.array(
		z.object({
			oid: z.string(),
			size: z.number().gte(0),
			authenticated: z.boolean().optional(),
		}),
	),
	hash_algo: z.string().default("sha256"),
});

export const batchResponseSchema = z.object({
	transfer: z.string().optional(),
	objects: z.array(
		z
			.object({
				oid: z.string(),
				size: z.number().gte(0),
				authenticated: z.boolean().optional(),
				actions: z
					.object({
						download: z
							.object({
								href: z.string(),
								header: z.record(z.any()).optional(),
								expires_in: z
									.number()
									.gte(-2147483647)
									.lte(2147483647)
									.optional(),
								expires_at: z.string().optional(),
							})
							.strict()
							.optional(),
						upload: z
							.object({
								href: z.string(),
								header: z.record(z.any()).optional(),
								expires_in: z
									.number()
									.gte(-2147483647)
									.lte(2147483647)
									.optional(),
								expires_at: z.string().optional(),
							})
							.strict()
							.optional(),
						verify: z
							.object({
								href: z.string(),
								header: z.record(z.any()).optional(),
								expires_in: z
									.number()
									.gte(-2147483647)
									.lte(2147483647)
									.optional(),
								expires_at: z.string().optional(),
							})
							.strict()
							.optional(),
					})
					.strict()
					.optional(),
				error: z
					.object({ code: z.number(), message: z.string() })
					.strict()
					.optional(),
			})
			.strict(),
	),
	message: z.string().optional(),
	request_id: z.string().optional(),
	documentation_url: z.string().optional(),
});

export const createLockRequestSchema = z.object({
	path: z.string(),
	ref: z.object({ name: z.string() }).optional(),
});

export const createLockResponseSchema = z.object({
	lock: z.object({
		id: z.string(),
		path: z.string(),
		locked_at: z.string(),
		owner: z.object({ name: z.string().optional() }).optional(),
	}),
	message: z.string().optional(),
	request_id: z.string().optional(),
	documentation_url: z.string().optional(),
});

export const lockListResponseSchema = z.object({
	locks: z.array(
		z.object({
			id: z.string().optional(),
			path: z.string().optional(),
			locked_at: z.string().optional(),
			owner: z.object({ name: z.string().optional() }).optional(),
		}),
	),
	next_cursor: z.string().optional(),
});
