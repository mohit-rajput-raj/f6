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
      <Field orientation="horizontal">
        <Checkbox id="terms-checkbox" name="terms-checkbox" />
        <Label htmlFor="terms-checkbox">Accept terms and conditions</Label>
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id="terms-checkbox-2"
          name="terms-checkbox-2"
          defaultChecked
        />
        <FieldContent>
          <FieldLabel htmlFor="terms-checkbox-2">
            Accept terms and conditions
          </FieldLabel>
          <FieldDescription>
            By clicking this checkbox, you agree to the terms.
          </FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="horizontal" data-disabled>
        <Checkbox id="toggle-checkbox" name="toggle-checkbox" disabled />
        <FieldLabel htmlFor="toggle-checkbox">Enable notifications</FieldLabel>
      </Field>
     
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
            <FieldTitle>{minimapOpen ? "Disable Minimap" : "Enable Minimap"}</FieldTitle>
            <FieldDescription>
              You can hide Minimap at any time.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </FieldGroup>
  );
}
