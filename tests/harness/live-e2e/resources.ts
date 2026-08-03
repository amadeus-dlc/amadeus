export type CleanupResourceState = "planned" | "created" | "released";

export interface CleanupResource {
  readonly id: string;
  readonly kind: string;
  readonly locator: string;
  readonly credentialBearing: boolean;
  readonly state: CleanupResourceState;
}

type NewCleanupResource = Omit<CleanupResource, "state">;

export class ResourceRegistrar {
  readonly #resources = new Map<string, CleanupResource>();

  registerPlanned(resource: NewCleanupResource): void {
    if (this.#resources.has(resource.id)) throw new Error(`cleanup resource already registered: ${resource.id}`);
    this.#resources.set(resource.id, { ...resource, state: "planned" });
  }

  markCreated(id: string): void {
    this.#transition(id, "planned", "created");
  }

  markReleased(id: string): void {
    const resource = this.#required(id);
    if (resource.state === "released") return;
    this.#resources.set(id, { ...resource, state: "released" });
  }

  snapshot(): readonly CleanupResource[] {
    return [...this.#resources.values()].map((resource) => ({ ...resource }));
  }

  #transition(id: string, from: CleanupResourceState, to: CleanupResourceState): void {
    const resource = this.#required(id);
    if (resource.state !== from) throw new Error(`cleanup resource ${id} is ${resource.state}, expected ${from}`);
    this.#resources.set(id, { ...resource, state: to });
  }

  #required(id: string): CleanupResource {
    const resource = this.#resources.get(id);
    if (resource === undefined) throw new Error(`cleanup resource not registered: ${id}`);
    return resource;
  }
}
