import Image from "next/image";

export function CoastPilotLogoMark() {
  return <span className="brand-mark brand-logo-crop" aria-hidden="true">
    <Image src="/images/logo1024.jpg" alt="" width={90} height={90} className="brand-logo-crop-image" priority />
  </span>;
}
