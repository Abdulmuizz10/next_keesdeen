const Marquee = ({
  text,
  speed = 28,
  dark = false,
}: {
  text: string;
  speed?: number;
  dark?: boolean;
}) => {
  return (
    <div
      style={{
        overflow: "hidden",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderBottom: "1px solid #e0e0e0",
        width: "100%",
      }}
    >
      <div
        className="marquee-track"
        style={{
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            style={{
              flexShrink: 0,
              fontSize: "clamp(0.65rem, 1.1vw, 0.85rem)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "black",
              padding: "1rem 2rem",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
