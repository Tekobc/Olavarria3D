import Image from "next/image";

export function BrandMark({ className }: { className: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={80}
      src="/olavarria3d-logo.jpeg"
      width={80}
    />
  );
}
