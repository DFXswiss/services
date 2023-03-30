import StyledVideoGrid, { VideoSourcesProps } from './StyledVideoGrid';

export interface DfxVideoHelpModalContentProps {
  videoSources: VideoSourcesProps[];
  numCols?: number;
  title?: string;
  description?: string;
}

export default function DfxVideoHelpModalContent({
  numCols = 3,
  videoSources,
  title,
  description,
}: DfxVideoHelpModalContentProps) {
  return (
    <div className="text-center ">
      <div className="mb-9 mt-3">
        <h2 className="text-2xl font-black mb-3">{title}</h2>
        <p>{description}</p>
      </div>

      <StyledVideoGrid videoSources={videoSources} numCols={numCols} />
    </div>
  );
}
