export default function CardBack({ small = false }) {
  const w = small ? 60 : 80;
  const h = small ? 84 : 112;

  return (
    <div
      className="rounded-lg flex items-center justify-center shadow-md"
      style={{
        width: w,
        height: h,
        background: 'linear-gradient(145deg, #5a4a32 0%, #3a2a1a 50%, #2a1a0a 100%)',
        border: '2px solid #1a1208',
      }}
    >
      <div
        className="rounded-md flex items-center justify-center"
        style={{
          width: w - 10,
          height: h - 10,
          border: '1.5px solid #8a7a5a44',
        }}
      >
        <span style={{ fontSize: small ? 18 : 24, color: '#8a7a5a88' }}>⛤</span>
      </div>
    </div>
  );
}
