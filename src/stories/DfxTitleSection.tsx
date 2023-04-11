import imageFile from './assets/mm-header-graphic.png';

interface DfxTitleSectionProps {
  subheading: string;
  heading: string;
}

export default function DfxTitleSection({ subheading, heading }: DfxTitleSectionProps) {
  return (
    <div className="flex-col justify-between content-center text-center mb-12">
      <img
        src={imageFile}
        alt="DFX Metamask Exchange Header Graphic"
        width="220"
        height="220"
        className="mx-auto mb-6"
      />
      <h4 className="uppercase tracking-widest">{subheading}</h4>
      <h1>{heading}</h1>
    </div>
  );
}
