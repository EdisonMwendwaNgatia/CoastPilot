"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { OTHER_OPTION } from "@/lib/onboarding-options";

type Option = { value: string; label: string };

export function OnboardingSelect({
  name,
  label,
  options,
  initialSelected = [],
  allowOther = false,
  initialOther = "",
  otherInputName,
}: {
  name: string;
  label: string;
  options: Option[];
  initialSelected?: string[];
  allowOther?: boolean;
  initialOther?: string;
  otherInputName?: string;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [other, setOther] = useState(initialOther);
  const otherSelected = selected.includes(OTHER_OPTION);
  const selectedLabels = options.filter((option) => selected.includes(option.value)).map((option) => option.label);
  if (otherSelected && other.trim()) selectedLabels.push(other.trim());

  function toggle(value: string) {
    setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  return (
    <div className="onboarding-select-field span-two">
      <span className="onboarding-select-label">{label}</span>
      <details className="onboarding-select">
        <summary aria-label={`${label}: open options`}>
          <span>{selectedLabels.length ? selectedLabels.join(", ") : `Choose ${label.toLowerCase()}`}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="onboarding-select-menu">
          {options.map((option) => <button className={`onboarding-select-option${selected.includes(option.value) ? " is-selected" : ""}`} key={option.value} type="button" aria-pressed={selected.includes(option.value)} onClick={() => toggle(option.value)}><span>{option.label}</span>{selected.includes(option.value) && <Check size={15} aria-hidden="true" />}</button>)}
          {allowOther && <>
            <button className={`onboarding-select-option${otherSelected ? " is-selected" : ""}`} type="button" aria-pressed={otherSelected} onClick={() => toggle(OTHER_OPTION)}><span>Other</span>{otherSelected && <Check size={15} aria-hidden="true"/>}</button>
            {otherSelected && <label className="onboarding-other-input">Add your own {label.toLowerCase()}<input name={otherInputName ?? `${name}_other`} value={other} onChange={(event) => setOther(event.target.value)} maxLength={500} placeholder={`Type ${label.toLowerCase()}`} /></label>}
          </>}
          {selected.map((value) => <input key={value} type="hidden" name={name} value={value}/>) }
        </div>
      </details>
      <small className="onboarding-select-hint">Select all that apply. Your choices help match you with relevant work.</small>
    </div>
  );
}
