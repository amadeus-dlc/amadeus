import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import {
  type FrozenTlaModelBundle,
  type FrozenTlaModelReceipt,
  type TlaInvariantSourceLocation,
  tlaInvariantSourceMap,
  validateFrozenTlaModelReceipt,
} from "./tla-arm.ts";
import {
  loadVerifiedTlaSources,
  selectVerifiedModel,
  type VerifiedModelSource,
} from "./tla-model-loader.ts";
import { TLA_EXECUTION_MODEL_NAME } from "./tla-model-map.ts";

const VERIFIED_RECEIPT_SCHEMA = "amadeus.verified-tla-model-receipt.v1" as const;
const VERIFIED_RECEIPT_IDENTITY_DOMAIN = "amadeus.formal-verif.tla.verified-model.v1";
const VERIFIED_RECEIPT_KEYS = [
  "schema",
  "modelName",
  "modelIdentity",
  "moduleBytesIdentity",
  "cfgBytesIdentity",
  "auxiliaryModules",
  "vocabulary",
  "invariantSourceMap",
] as const;

export const REFEREE_RECEIPT_SCHEMA = "amadeus.referee-tla-model-receipt.v1" as const;
export const REFEREE_RECEIPT_IDENTITY_DOMAIN = "amadeus.formal-verif.tla.referee-model.v1";
export const REFEREE_RECEIPT_KEYS = VERIFIED_RECEIPT_KEYS;

const SHA256 = /^[0-9a-f]{64}$/;
const MODULE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface VerifiedTlaAuxiliaryModuleReceipt {
  readonly name: string;
  readonly moduleBytesIdentity: string;
}

export interface VerifiedTlaVocabularyReceipt {
  readonly moduleName: string;
  readonly namedInvariants: readonly string[];
  readonly traceStateVariables: readonly string[];
}

export interface VerifiedTlaModelReceipt {
  readonly schema: typeof VERIFIED_RECEIPT_SCHEMA;
  readonly modelName: string;
  readonly modelIdentity: string;
  readonly moduleBytesIdentity: string;
  readonly cfgBytesIdentity: string;
  readonly auxiliaryModules: readonly VerifiedTlaAuxiliaryModuleReceipt[];
  readonly vocabulary: VerifiedTlaVocabularyReceipt;
  readonly invariantSourceMap: Readonly<Record<string, TlaInvariantSourceLocation>>;
}

export interface VerifiedTlaModelBundle extends VerifiedTlaModelReceipt {
  readonly moduleBytes: Uint8Array;
  readonly cfgBytes: Uint8Array;
}

/**
 * A model the referee is proving before it can be registered: the receipt is
 * bound to the bytes on disk rather than to a model-map entry, so it carries
 * no registry-side bytes for the toolchain to stage. Its validation is
 * self-contained — the byte check at preparation is what ties it to the files.
 */
export interface RefereeTlaModelReceipt {
  readonly schema: typeof REFEREE_RECEIPT_SCHEMA;
  readonly modelName: string;
  readonly modelIdentity: string;
  readonly moduleBytesIdentity: string;
  readonly cfgBytesIdentity: string;
  readonly auxiliaryModules: readonly VerifiedTlaAuxiliaryModuleReceipt[];
  readonly vocabulary: VerifiedTlaVocabularyReceipt;
  readonly invariantSourceMap: Readonly<Record<string, TlaInvariantSourceLocation>>;
}

export type SourceBoundTlaModelReceipt = VerifiedTlaModelReceipt | RefereeTlaModelReceipt;

export type ModelCheckReceipt =
  | FrozenTlaModelReceipt
  | VerifiedTlaModelReceipt
  | RefereeTlaModelReceipt;
export type ModelCheckReceiptBundle =
  | FrozenTlaModelBundle
  | VerifiedTlaModelBundle
  | RefereeTlaModelReceipt;

export interface ModelCheckReceiptValidationError {
  readonly kind: "ModelCheckReceiptValidationError";
  readonly message: string;
}

function reject(message: string): Result<never, ModelCheckReceiptValidationError> {
  return { ok: false, error: { kind: "ModelCheckReceiptValidationError", message } };
}

function exactPlainObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actual = Reflect.ownKeys(value);
  return actual.every((key) => typeof key === "string")
    && (actual as string[]).sort().join("\n") === [...keys].sort().join("\n");
}

function invariantSourceMap(
  source: VerifiedModelSource,
  names: readonly string[],
): Result<Record<string, TlaInvariantSourceLocation>, ModelCheckReceiptValidationError> {
  const locations = tlaInvariantSourceMap(source.moduleSource, names);
  return locations.ok
    ? locations
    : reject(
      `model ${source.model.name} is missing invariant formula ${locations.error.missingInvariant}`,
    );
}

export function createVerifiedTlaModelReceipt(
  source: VerifiedModelSource,
): Result<VerifiedTlaModelReceipt, ModelCheckReceiptValidationError> {
  if (source.model.name === TLA_EXECUTION_MODEL_NAME) {
    return reject(`${TLA_EXECUTION_MODEL_NAME} requires the frozen model receipt`);
  }
  const vocabulary = source.model.vocabulary;
  if (vocabulary === undefined) {
    return reject(`model ${source.model.name} has no declared vocabulary`);
  }
  const locations = invariantSourceMap(source, vocabulary.namedInvariants);
  if (!locations.ok) return locations;
  const identityInput = {
    schema: VERIFIED_RECEIPT_SCHEMA,
    modelName: source.model.name,
    moduleBytesIdentity: source.moduleIdentity,
    cfgBytesIdentity: source.cfgIdentity,
    auxiliaryModules: source.auxIdentities.map(({ path, identity }) => {
      const fileName = path.split(/[\\/]/).at(-1) ?? "";
      return {
        name: fileName.replace(/\.tla$/, ""),
        moduleBytesIdentity: identity,
      };
    }),
    vocabulary: {
      moduleName: source.model.name,
      namedInvariants: [...vocabulary.namedInvariants],
      traceStateVariables: [...vocabulary.traceStateVariables],
    },
    invariantSourceMap: locations.value,
  };
  return {
    ok: true,
    value: {
      ...identityInput,
      modelIdentity: canonicalIdentity(
        identityInput,
        VERIFIED_RECEIPT_IDENTITY_DOMAIN,
      ).sha256,
    },
  };
}

export function isVerifiedTlaModelReceipt(
  input: unknown,
): input is VerifiedTlaModelReceipt {
  return input !== null
    && typeof input === "object"
    && !Array.isArray(input)
    && "schema" in input
    && input.schema === VERIFIED_RECEIPT_SCHEMA;
}

export function validateVerifiedTlaModelReceipt(
  input: unknown,
): Result<VerifiedTlaModelBundle, ModelCheckReceiptValidationError> {
  if (!exactPlainObject(input, VERIFIED_RECEIPT_KEYS)) {
    return reject("receipt must have the exact verified-source model shape");
  }
  if (input.schema !== VERIFIED_RECEIPT_SCHEMA || typeof input.modelName !== "string") {
    return reject("receipt schema or model name is invalid");
  }
  if (input.modelName === TLA_EXECUTION_MODEL_NAME) {
    return reject(`${TLA_EXECUTION_MODEL_NAME} requires the frozen model receipt`);
  }
  const loaded = loadVerifiedTlaSources();
  if (!loaded.ok) return reject(`verified sources are unavailable: ${loaded.error.detail}`);
  const selected = selectVerifiedModel(loaded.value, input.modelName);
  if (!selected.ok) return reject(`verified model is unavailable: ${input.modelName}`);
  const expected = createVerifiedTlaModelReceipt(selected.value);
  if (!expected.ok) return expected;
  try {
    const { modelIdentity, ...identityInput } = input;
    const actualIdentity = canonicalIdentity(
      identityInput,
      VERIFIED_RECEIPT_IDENTITY_DOMAIN,
    ).sha256;
    if (typeof modelIdentity !== "string"
      || actualIdentity !== expected.value.modelIdentity
      || modelIdentity !== expected.value.modelIdentity) {
      return reject("receipt differs from the selected verified model");
    }
  } catch {
    return reject("receipt differs from the selected verified model");
  }
  return {
    ok: true,
    value: {
      ...expected.value,
      moduleBytes: selected.value.moduleBytes,
      cfgBytes: selected.value.cfgBytes,
    },
  };
}

export function isRefereeTlaModelReceipt(
  input: unknown,
): input is RefereeTlaModelReceipt {
  return input !== null
    && typeof input === "object"
    && !Array.isArray(input)
    && "schema" in input
    && input.schema === REFEREE_RECEIPT_SCHEMA;
}

export function isSourceBoundTlaModelReceipt(
  input: unknown,
): input is SourceBoundTlaModelReceipt {
  return isVerifiedTlaModelReceipt(input) || isRefereeTlaModelReceipt(input);
}

function auxiliaryModulesAreWellFormed(value: unknown, modelName: string): boolean {
  if (!Array.isArray(value)) return false;
  const names = new Set<string>();
  for (const auxiliary of value) {
    if (!exactPlainObject(auxiliary, ["name", "moduleBytesIdentity"])) return false;
    const { name, moduleBytesIdentity } = auxiliary;
    if (typeof name !== "string" || !MODULE_NAME.test(name) || name === modelName) return false;
    if (typeof moduleBytesIdentity !== "string" || !SHA256.test(moduleBytesIdentity)) return false;
    if (names.has(name)) return false;
    names.add(name);
  }
  return true;
}

function vocabularyIsWellFormed(value: unknown, modelName: string): value is VerifiedTlaVocabularyReceipt {
  if (!exactPlainObject(value, ["moduleName", "namedInvariants", "traceStateVariables"])) return false;
  const { moduleName, namedInvariants, traceStateVariables } = value;
  return moduleName === modelName
    && Array.isArray(namedInvariants)
    && namedInvariants.every((name) => typeof name === "string" && MODULE_NAME.test(name))
    && Array.isArray(traceStateVariables)
    && traceStateVariables.every((name) => typeof name === "string" && MODULE_NAME.test(name));
}

function invariantSourceMapCovers(value: unknown, invariants: readonly string[]): boolean {
  if (!exactPlainObject(value, invariants)) return false;
  return Object.values(value).every((location) =>
    exactPlainObject(location, ["line", "column"])
    && Number.isInteger(location.line)
    && Number.isInteger(location.column));
}

/**
 * Validates a referee receipt against itself: exact shape, well-formed byte
 * identities and vocabulary, and an identity that still hashes to the value it
 * carries. No model map is consulted — the model is not registered yet.
 */
function sha256Field(value: unknown): value is string {
  return typeof value === "string" && SHA256.test(value);
}

export function validateRefereeTlaModelReceipt(
  input: unknown,
): Result<RefereeTlaModelReceipt, ModelCheckReceiptValidationError> {
  if (!exactPlainObject(input, REFEREE_RECEIPT_KEYS)) {
    return reject("receipt must have the exact referee model shape");
  }
  const { schema, modelName, modelIdentity, moduleBytesIdentity, cfgBytesIdentity } = input;
  if (schema !== REFEREE_RECEIPT_SCHEMA || typeof modelName !== "string" || !MODULE_NAME.test(modelName)) {
    return reject("receipt schema or model name is invalid");
  }
  if (modelName === TLA_EXECUTION_MODEL_NAME) {
    return reject(`${TLA_EXECUTION_MODEL_NAME} requires the frozen model receipt`);
  }
  if (!sha256Field(modelIdentity) || !sha256Field(moduleBytesIdentity) || !sha256Field(cfgBytesIdentity)) {
    return reject("receipt byte identities are invalid");
  }
  if (!auxiliaryModulesAreWellFormed(input.auxiliaryModules, modelName)) {
    return reject("receipt auxiliary modules are invalid");
  }
  if (!vocabularyIsWellFormed(input.vocabulary, modelName)) {
    return reject("receipt vocabulary does not describe the named model");
  }
  if (!invariantSourceMapCovers(input.invariantSourceMap, input.vocabulary.namedInvariants)) {
    return reject("receipt invariant source map does not cover the declared invariants");
  }
  const { modelIdentity: _carried, ...identityInput } = input;
  if (canonicalIdentity(identityInput, REFEREE_RECEIPT_IDENTITY_DOMAIN).sha256 !== modelIdentity) {
    return reject("receipt identity differs from the receipt it is carried on");
  }
  return { ok: true, value: input as unknown as RefereeTlaModelReceipt };
}

export function validateModelCheckReceipt(
  input: unknown,
): Result<ModelCheckReceiptBundle, ModelCheckReceiptValidationError> {
  if (isRefereeTlaModelReceipt(input)) return validateRefereeTlaModelReceipt(input);
  if (isVerifiedTlaModelReceipt(input)) return validateVerifiedTlaModelReceipt(input);
  const frozen = validateFrozenTlaModelReceipt(input);
  return frozen.ok ? frozen : reject(frozen.error.message);
}
