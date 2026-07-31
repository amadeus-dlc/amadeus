// Compatibility aliases for the original Intent Mirror configuration names.
// New feature domains depend on amadeus-layered-config.ts directly.

export {
  type AmadeusConfig as MirrorConfig,
  type AmadeusConfigIssue as MirrorConfigIssue,
  type AmadeusConfigKey as MirrorConfigKey,
  type AmadeusConfigLayerInput as MirrorConfigLayerInput,
  type AmadeusConfigOutcome as MirrorConfigOutcome,
  type AmadeusConfigReadHooks as MirrorConfigReadHooks,
  type AmadeusConfigReadOutcome as MirrorConfigReadOutcome,
  type ConfigLayer,
  parseAmadeusConfigLayers as parseMirrorConfigLayers,
  readAmadeusConfigLayers as readMirrorConfigLayers,
  resolveAmadeusConfig as resolveMirrorConfig,
} from "./amadeus-layered-config.ts";
