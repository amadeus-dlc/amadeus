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

export type ModelCheckReceipt = FrozenTlaModelReceipt | VerifiedTlaModelReceipt;
export type ModelCheckReceiptBundle = FrozenTlaModelBundle | VerifiedTlaModelBundle;

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

export function validateModelCheckReceipt(
  input: unknown,
): Result<ModelCheckReceiptBundle, ModelCheckReceiptValidationError> {
  if (isVerifiedTlaModelReceipt(input)) return validateVerifiedTlaModelReceipt(input);
  const frozen = validateFrozenTlaModelReceipt(input);
  return frozen.ok ? frozen : reject(frozen.error.message);
}
