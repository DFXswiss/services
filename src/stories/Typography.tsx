export default function Typography() {
  return (
    <div>
      <h1>Heading 1 / 28px / "text-2xl font-black"</h1>
      <h2>Heading 2 / 20px / "text-lg font-bold"</h2>
      <h3>Heading 3 / 20px / regular</h3>
      <h4 className="uppercase tracking-widest">Sub • Top • Heading "uppercase tracking-widest" </h4>
      <h5>Heading 5 (idle) </h5>
      <h6>Heading 6 (idle) </h6>
      <br />
      <p>
        <strong>Normal paragraph, text-base, 16px/22px, 1rem</strong> / Aenean lacinia bibendum nulla sed consectetur.
        Nullam id dolor id nibh ultricies vehicula ut id elit. Aenean lacinia bibendum nulla sed consectetur. Fusce
        dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus.
        Morbi leo risus, porta ac consectetur ac, vestibulum at eros.
      </p>
      <br />
      <p className="text-sm">
        <strong>Small Text "text-sm", 14px / 0.875rem</strong> / Aenean lacinia bibendum nulla sed consectetur. Nullam
        id dolor id nibh ultricies vehicula ut id elit. Aenean lacinia bibendum nulla sed consectetur. Fusce dapibus,
        tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Morbi leo
        risus, porta ac consectetur ac, vestibulum at eros.
      </p>
      <br />
      <p className="text-xs">
        <strong>Very Small Text "text-xs", 12px / 0.75rem</strong> , used for Form Labels // Aenean lacinia bibendum
        nulla sed consectetur. Nullam id dolor id nibh ultricies vehicula ut id elit. Aenean lacinia bibendum nulla sed
        consectetur. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo
        sit amet risus. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.
      </p>
      <br />
      <p className="text-2xs">
        <strong>Smallest Text, "text-2xs" 10px / 0.625rem</strong> , used for Form Labels // Aenean lacinia bibendum
        nulla sed consectetur. Nullam id dolor id nibh ultricies vehicula ut id elit. Aenean lacinia bibendum nulla sed
        consectetur. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo
        sit amet risus. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.
      </p>
    </div>
  );
}
