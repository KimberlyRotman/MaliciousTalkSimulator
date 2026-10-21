function hue(seed) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

export default function Avatar({ contact, size = 48, ring = false }) {
  const style = { width: size, height: size, fontSize: size * 0.36 };
  if (!contact.photo) {
    const h = hue(contact.id || contact.name || 'x');
    style.background = `linear-gradient(135deg, hsl(${h} 70% 62%), hsl(${(h + 40) % 360} 65% 48%))`;
  }
  return (
    <div className={`avatar${ring ? ' ring' : ''}`} style={style}>
      {contact.photo ? <img src={contact.photo} alt="" /> : initials(contact.name || '')}
    </div>
  );
}
