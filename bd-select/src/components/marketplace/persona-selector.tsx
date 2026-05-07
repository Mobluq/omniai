"use client";

import type { Persona } from "@/lib/client/api";

type PersonaSelectorProps = {
  personas: Persona[];
  activeUserId: string;
  onChange: (userId: string) => void;
  label?: string;
};

export function PersonaSelector({
  personas,
  activeUserId,
  onChange,
  label = "Buyer persona",
}: PersonaSelectorProps) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        value={activeUserId}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-72 rounded-md border border-border bg-white px-3 py-2"
      >
        <option value="">Select persona</option>
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.name ?? persona.email} / {persona.role} / {persona.kycStatus}
          </option>
        ))}
      </select>
    </label>
  );
}
