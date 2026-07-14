// U-02 fail-closed production slot. U-04 replaces only this module's slot.

import {
  DriverRegistration,
  type DriverRegistration as DriverRegistrationValue,
} from "../amadeus-swarm-driver-adapter-contract.ts";

const result = DriverRegistration.build({
  provider: "codex",
  drivers: ["codex-ultra"],
  harnesses: ["codex"],
  slot: { kind: "unavailable", diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED" },
});

if (result.type === "err") throw new Error("Invalid Codex swarm-driver registration");

export const codexDriverRegistration: DriverRegistrationValue = result.value;
