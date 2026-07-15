import AsyncCreatableSelect from "react-select/async-creatable";
import { api } from "../api";
import { Tag } from "../types";

interface Option {
  value: string;
  label: string;
}

/** Tag input with autocompletion of previously used tags; new tags are created on first use. */
export default function TagSelect({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const load = async (input: string): Promise<Option[]> => {
    const tags = await api.get<Tag[]>(`/api/tags?q=${encodeURIComponent(input)}`);
    return tags.map((t) => ({ value: t.name, label: t.name }));
  };

  return (
    <AsyncCreatableSelect<Option, true>
      isMulti
      defaultOptions
      cacheOptions
      loadOptions={load}
      value={value.map((v) => ({ value: v, label: v }))}
      onChange={(opts) => onChange(opts.map((o) => o.value))}
      placeholder={placeholder}
      classNamePrefix="rs"
    />
  );
}
