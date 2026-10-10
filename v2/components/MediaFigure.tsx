import Image from 'next/image';
import type { ProjectMedia } from '@/content/types';

export function MediaFigure({ media }: { media: ProjectMedia }) {
  const isVideo = media.kind === 'video' || /\.(mp4|webm)(\?|$)/i.test(media.src);
  const isRemote = media.src.startsWith('https://');
  return (
    <figure className="media-figure">
      {isVideo ? <video controls preload="metadata" poster={media.poster} aria-label={media.alt} src={media.src} /> :
        <a href={media.src} target="_blank" rel="noopener noreferrer" aria-label={`Agrandir : ${media.caption}`}>
          {isRemote ? <img src={media.src} alt={media.alt} width={media.width} height={media.height} /> : <Image src={media.src} alt={media.alt} width={media.width} height={media.height} sizes="(max-width: 760px) 100vw, 90vw" />}
        </a>}
      <figcaption><span>{media.caption}</span>{!isVideo && <span>Agrandir ↗</span>}</figcaption>
    </figure>
  );
}
