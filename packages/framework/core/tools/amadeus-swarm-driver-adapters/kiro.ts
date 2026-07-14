// U-02 fail-closed production slot. U-05 replaces only this module's slot.

import {
  DriverRegistration,
  type DriverRegistration as DriverRegistrationValue,
} from "../amadeus-swarm-driver-adapter-contract.ts";

const result = DriverRegistration.build({
  provider: "kiro",
  drivers: ["kiro-subagent"],
  harnesses: ["kiro", "kiro-ide"],
  slot: { kind: "unavailable", diagnosticCode: "REGISTRATION_SLOT_UNIMPLEMENTED" },
});

if (result.type === "err") throw new Error("Invalid Kiro swarm-driver registration");

export const kiroDriverRegistration: DriverRegistrationValue = result.value;
