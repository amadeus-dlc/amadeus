// U-02 fail-closed production slot. U-03 replaces only this module's slot.

import {
  DriverRegistration,
  type DriverRegistration as DriverRegistrationValue,
} from "../amadeus-swarm-driver-adapter-contract.ts";

const result = DriverRegistration.build({
  provider: "claude",
  drivers: ["claude-agent-teams", "claude-ultracode"],
  harnesses: ["claude"],
  slot: { kind: "unavailable", diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED" },
});

if (result.type === "err") throw new Error("Invalid Claude swarm-driver registration");

export const claudeDriverRegistration: DriverRegistrationValue = result.value;
