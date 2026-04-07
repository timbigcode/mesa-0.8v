import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const img = readFileSync(join(process.cwd(), "public/icons/apple-touch-icon.png"));
  const base64 = img.toString("base64");
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/png;base64,${base64}`} width={180} height={180} alt="Mesa" />,
    { ...size }
  );
}
