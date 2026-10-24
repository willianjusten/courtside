import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";

export type ToggleOption<Value> = {
  value: Value;
  label: string;
};

// A row of pressed-state pills, of which exactly one is selected.
export function ToggleGroup<Value extends string | number>({
  label,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  options: ToggleOption<Value>[];
  selectedValue: Value;
  onSelect: (value: Value) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex w-full gap-[3px] rounded-full border border-white/10 bg-white/5 p-[3px] md:w-auto"
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(option.value)}
            // The pill is drawn 36px tall; its hit area reaches 4px past the toggle's edge to make a 44px target.
            className={`relative min-h-9 grow cursor-pointer rounded-full px-2.5 text-xs font-bold tracking-[0.04em] transition-colors before:absolute before:inset-x-0 before:-inset-y-1 md:grow-0 md:px-3.5 ${FOCUS_RING_CLASS_NAME} ${isSelected ? "bg-white/92 text-ink" : "text-secondary hover:bg-white/8"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
