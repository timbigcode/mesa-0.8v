"use client";

interface GuestDetails {
  name: string;
  phone: string;
  email: string;
  special_requests: string;
}

interface Props {
  details: GuestDetails;
  onChange: (details: GuestDetails) => void;
}

const inputClass =
  "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all bg-white/80 border border-[rgba(209,209,214,0.5)] focus:border-[#007AFF] focus:ring-2 focus:ring-[rgba(0,122,255,0.15)]";

export function StepGuestDetails({ details, onChange }: Props) {
  function update(field: keyof GuestDetails) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...details, [field]: e.target.value });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-apple-gray1)" }}>
          Full name <span style={{ color: "var(--color-apple-red)" }}>*</span>
        </label>
        <input
          type="text"
          placeholder="John Appleseed"
          value={details.name}
          onChange={update("name")}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-apple-gray1)" }}>
          Phone number <span style={{ color: "var(--color-apple-red)" }}>*</span>
        </label>
        <input
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={details.phone}
          onChange={update("phone")}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-apple-gray1)" }}>
          Email address <span className="opacity-50">(optional)</span>
        </label>
        <input
          type="email"
          placeholder="john@example.com"
          value={details.email}
          onChange={update("email")}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-apple-gray1)" }}>
          Special requests <span className="opacity-50">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Allergies, high chair, window seat…"
          value={details.special_requests}
          onChange={update("special_requests")}
          className={`${inputClass} resize-none`}
        />
      </div>
    </div>
  );
}
