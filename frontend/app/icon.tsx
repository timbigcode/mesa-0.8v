import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const img = readFileSync(join(process.cwd(), "public/icons/icon-192.png"));
  const base64 = img.toString("base64");
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/png;base64,${base64}`} width={32} height={32} alt="Mesa" />,
    { ...size }
  );
}
