import { DurableObject } from "cloudflare:workers";
import type { Bindings } from ".";

export class Lock extends DurableObject {
      locked_at: string | null
      state: DurableObjectState

      constructor(state: DurableObjectState,  env: Bindings) {
        super(state, env)
        this.locked_at = null
        this.state = state
      }

    async lock(){
        this.locked_at = new Date().toISOString()
        this.state.storage.put("locked_at", this.locked_at)
        return this.locked_at
    }

    async unlock(){
        this.locked_at = null
        this.state.storage.delete("locked_at")
    }
}




