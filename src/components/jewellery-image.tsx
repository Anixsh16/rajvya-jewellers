import Image, { type ImageProps } from 'next/image';
export function JewelleryImage({
  src,
  alt,
  width = 640,
  height = 640,
  sizes = '(max-width: 700px) 100vw, 33vw',
  ...props
}: ImageProps) {
  const local =
    typeof src === 'string' && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(src);
  return (
    <Image
      {...props}
      alt={alt}
      src={src}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized={local || props.unoptimized}
    />
  );
}
