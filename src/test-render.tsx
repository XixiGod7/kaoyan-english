import React from 'react';
import { createRoot } from 'react-dom/client';

const text = `Located in the southern Peloponnesian peninsula, Pavlopetri (the modern name of the site) emerged as a Neolithic settlement around 3500 B.C. and became an important trading center for Mycenaean Greece (1650-1180 B.C.). This area of the Aegean Sea is 1 to earthquakes and tsunamis, which caused the city to 2 sink. The slow sea level rise in the Mediterranean 3 the city more than 3,000 years ago.

For millennia, the city's 4 lay unseen below some 13 feet of water. They were covered by a thick layer of sand 5 the island of Laconia. In recent decades, shifting 6 and climate change have eroded a natural barrier that 7 Pavlopetri. In 1967 a scientific survey of the Peloponnesian coast was 8 data to analyze changes in sea levels 9 British oceanographer Nicholas Flemming first spotted the submerged 10 . A year later, he returned with a few students to 11 the location and map the site. The team identified some 15 buildings, courtyards, a network of streets, and two chamber tombs. 12 the exciting initial finds, the site would lie 13 for decades before archaeologists would return.`;

const renderTextWithBlanks = (paraText: string) => {
    const numsPattern = Array.from({ length: 40 }, (_, i) => i + 1).join('|');
    const pattern = new RegExp(`(?<!\\d[,.]?)\\b(${numsPattern})\\b(?!(?:[,.]\\d|\\d|\\s*%))`, 'g');

    const parts = paraText.split(pattern);
    if (parts.length === 1) return paraText;

    return (
      <>
        {parts.map((part, idx) => {
          if (part.match(pattern)) {
            const num = parseInt(part, 10);
            return (
              <span key={idx} className="mx-1 inline-block" style={{ verticalAlign: 'middle' }}>
                <span
                  className="inline-flex items-center justify-center bg-blue-50 text-blue-600 rounded-md font-bold"
                  style={{ minWidth: '40px', height: '24px', padding: '0 8px', fontSize: '14px' }}
                >
                  {num}
                </span>
              </span>
            );
          }
          return <React.Fragment key={idx}>{part}</React.Fragment>;
        })}
      </>
    );
};

const App = () => {
  const paragraphs = text.split('\n').map(p => p.trim()).filter(p => p);
  return (
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <article style={{
        fontSize: '16px', lineHeight: 1.9, color: '#1e293b',
        fontFamily: 'Georgia, "Times New Roman", "SimSun", "Songti SC", serif',
        textAlign: 'left', wordBreak: 'break-word', padding: '16px 20px',
        background: '#fcfaf6', borderRadius: '12px', border: '1px solid #f1f0ea',
        display: 'flex', flexDirection: 'column', gap: '18px'
      }}>
        {paragraphs.map((p, idx) => (
          <p key={idx} style={{ margin: 0, textIndent: '2em' }}>
            {renderTextWithBlanks(p)}
          </p>
        ))}
      </article>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
