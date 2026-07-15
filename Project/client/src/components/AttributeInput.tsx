import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageUp, Loader2 } from "lucide-react";
import { Attribute } from "../types";

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD as string | undefined;
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET as string | undefined;

/** Drag-and-drop image upload straight to Cloudinary (images never touch our server). */
function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files[0] || !CLOUD || !PRESET) return;
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", files[0]);
        form.append("upload_preset", PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
        const data = await res.json();
        if (data.secure_url) onChange(data.secure_url);
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  return (
    <div className="space-y-2">
      {value && <img src={value} alt="" className="h-24 w-24 rounded-lg object-cover" />}
      {CLOUD && PRESET ? (
        <div
          {...getRootProps()}
          className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-sm text-slate-500 transition-colors ${
            isDragActive ? "border-brand-500 bg-brand-50 dark:bg-slate-800" : "border-slate-300 dark:border-slate-700"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageUp size={16} />}
          <span>Drag & drop an image, or click to select</span>
        </div>
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Image URL" />
      )}
    </div>
  );
}

/** Renders the right editor for an attribute type; the value is always a string. */
export default function AttributeInput({
  attribute,
  value,
  onChange,
  disabled,
}: {
  attribute: Attribute;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;
  switch (attribute.type) {
    case "TEXT":
      return (
        <textarea className="input min-h-24" value={value} onChange={(e) => onChange(e.target.value)} placeholder={attribute.description} />
      );
    case "NUMERIC":
      return <input type="number" className="input" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "DATE":
      return <input type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} />;
    case "PERIOD": {
      const [from = "", to = ""] = value.split("..");
      return (
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={from} onChange={(e) => onChange(`${e.target.value}..${to}`)} />
          <span className="text-slate-400">—</span>
          <input type="date" className="input" value={to} onChange={(e) => onChange(`${from}..${e.target.value}`)} />
        </div>
      );
    }
    case "BOOLEAN":
      return (
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          />
          {attribute.description}
        </label>
      );
    case "SELECT":
      return (
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {attribute.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    case "IMAGE":
      return <ImageInput value={value} onChange={onChange} />;
    default:
      return <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={attribute.description} />;
  }
}
