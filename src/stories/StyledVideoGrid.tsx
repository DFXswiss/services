export type VideoSourcesProps = {
  vidSrc: string;
  thumbSrc: string;
  title: string;
};

export interface StyledVideoGridProps {
  videoSources: VideoSourcesProps[];
  numCols?: number;
}

export default function StyledVideoGrid({ videoSources, numCols = 3 }: StyledVideoGridProps) {
  //const gridColStyle = 'grid-column: span ' + numCols + ' / span ' + numCols;
  const gridFractal = '1fr ';
  return (
    <div style={{ gridTemplateColumns: gridFractal.repeat(numCols) }} className="grid gap-6">
      {videoSources.map((video, index) => (
        <div key={index} className="place-self-end">
          <h3 className="my-3 text-base font-bold">{video.title}</h3>
          <video
            className="rounded-lg border border-white/20"
            src={video.vidSrc}
            poster={video.thumbSrc}
            controls
          ></video>
        </div>
      ))}
    </div>
  );
}
