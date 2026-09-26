import { ImageResponse } from 'next/og';
import fs from 'fs';

export const size = {
  width: 64,
  height: 64,
};
export const contentType = 'image/png';

const PRIMARY_LOGO_PATH = 'C:/Users/user/.gemini/antigravity/brain/e71df69a-4e72-4f87-8e27-e52180757592/.user_uploaded/media_1787403908437.jpg';
const FALLBACK_LOGO_PATH = 'C:/Users/user/.gemini/antigravity/brain/e71df69a-4e72-4f87-8e27-e52180757592/.user_uploaded/media_1787403411529.jpg';

export default function Icon() {
  let logoPath = PRIMARY_LOGO_PATH;
  if (!fs.existsSync(logoPath)) {
    logoPath = FALLBACK_LOGO_PATH;
  }

  let base64 = '';
  try {
    if (fs.existsSync(logoPath)) {
      base64 = `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }
  } catch (e) {}

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: 'transparent',
        }}
      >
        {base64 ? (
          <img
            src={base64}
            style={{
              width: '108%',
              height: '108%',
              objectFit: 'cover',
              borderRadius: '50%',
            }}
          />
        ) : (
          <div style={{ color: '#ffffff', fontWeight: 900, fontSize: 24 }}>NE</div>
        )}
      </div>
    ),
    {
      ...size,
    }
  );
}
