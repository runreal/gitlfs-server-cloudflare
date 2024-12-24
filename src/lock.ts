import { DurableObject } from "cloudflare:workers";
import type { Bindings } from ".";

export class Lock extends DurableObject {
	locked_at: string | null;
	path: string | null;
	state: DurableObjectState;

	constructor(state: DurableObjectState, env: Bindings) {
		super(state, env);
		this.state = state;
		this.locked_at = null;
		this.path = null;

		this.state.blockConcurrencyWhile(async () => {
			const locked_at = await this.state.storage.get<string>("locked_at");
			const path = await this.state.storage.get<string>("path");
			if (locked_at) {
				this.locked_at = locked_at;
			}
			if (path) {
				this.path = path;
			}
		});
	}

	async lock({ path }: { path: string }) {
		this.locked_at = new Date().toISOString();
		await this.state.storage.put("locked_at", this.locked_at);
		this.path = path;
		await this.state.storage.put("path", this.path);

		console.log("locked", this.locked_at, this.path);
		return this.locked_at;
	}

	async unlock() {
		this.locked_at = null;
		this.path = null;
		await this.state.storage.delete("path");
		await this.state.storage.delete("locked_at");
	}

	async get() {
		return { locked_at: this.locked_at, path: this.path };
	}
}
