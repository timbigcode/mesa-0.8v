import { NavBar } from "@/components/NavBar";
import { BookingFlow } from "@/components/BookingFlow";

export default function BookPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-apple-gray6)" }}>
      <NavBar />
      <BookingFlow />
    </div>
  );
}
