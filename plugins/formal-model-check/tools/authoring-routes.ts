// authoring-routes.ts — the single definition of the two routes that author or
// revise a model. A leaf module with no imports of its own, so both the
// applicability judgement and the registration gate can name the same set
// without either depending on the other.

export const AUTHORING_ROUTES: ReadonlySet<string> = new Set(["author-new", "revise-model"]);
