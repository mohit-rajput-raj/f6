"use client";

import { useUIStore } from "@/stores/ui.store";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@repo/ui/components/ui/field";
import { Label } from "@repo/ui/components/ui/label";

export function PanelSettings() {
  const { setMinimapOpen, minimapOpen } = useUIStore() ?? {};
  return (
    <FieldGroup className="max-w-sm px-3">
      <FieldLabel>
        <Field orientation="horizontal">
          <Checkbox
            id="toggle-checkbox-2"
            name="toggle-checkbox-2"
            checked={minimapOpen}
            onCheckedChange={(value) => {
              setMinimapOpen?.(Boolean(value));
            }}
          />
          <FieldContent>
            <FieldTitle>
              {minimapOpen ? "Disable Minimap" : "Enable Minimap"}
            </FieldTitle>
            <FieldDescription>
              You can hide Minimap at any time.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </FieldGroup>
  );
}
