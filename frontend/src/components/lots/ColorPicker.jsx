import React, { useState } from 'react';

const PASTEL_COLORS = [
  { hex: '#FECDD3', label: 'Rose' },
  { hex: '#FED7AA', label: 'Peche' },
  { hex: '#FEF08A', label: 'Jaune' },
  { hex: '#BBF7D0', label: 'Vert d\'eau' },
  { hex: '#A7F3D0', label: 'Menthe' },
  { hex: '#BAE6FD', label: 'Bleu ciel' },
  { hex: '#C7D2FE', label: 'Lavande' },
  { hex: '#DDD6FE', label: 'Lilas' },
  { hex: '#F5D0FE', label: 'Mauve' },
  { hex: '#E5E7EB', label: 'Gris perle' },
];

export default function ColorPicker({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(false);
  const isCustom = value && !PASTEL_COLORS.find(c => c.hex === value);

  return (
    <div>
      <label className="label" id="color-picker-label">Couleur de fond</label>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-labelledby="color-picker-label">
        {/* Aucune couleur */}
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          aria-label="Aucune couleur"
          onClick={() => { onChange(null); setShowCustom(false); }}
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs
            ${!value ? 'border-crf-rouge ring-2 ring-crf-rouge/30' : 'border-gray-300 hover:border-gray-400'}`}
        >
          ✕
        </button>

        {/* Pastels */}
        {PASTEL_COLORS.map(c => (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={value === c.hex}
            aria-label={c.label}
            onClick={() => { onChange(c.hex); setShowCustom(false); }}
            className={`w-7 h-7 rounded-full border-2 transition-all
              ${value === c.hex ? 'border-crf-rouge ring-2 ring-crf-rouge/30 scale-110' : 'border-gray-200 hover:border-gray-400 hover:scale-105'}`}
            style={{ backgroundColor: c.hex }}
          />
        ))}

        {/* Personnalisee */}
        <div className="relative">
          <button
            type="button"
            role="radio"
            aria-checked={isCustom}
            aria-label="Couleur personnalisee"
            onClick={() => setShowCustom(s => !s)}
            className={`w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center text-xs
              ${showCustom || isCustom
                ? 'border-crf-rouge text-crf-rouge'
                : 'border-gray-300 text-gray-400 hover:border-gray-400'}`}
            style={isCustom ? { backgroundColor: value } : {}}
          >
            {!isCustom ? '🎨' : ''}
          </button>
          {showCustom && (
            <input
              type="color"
              aria-label="Choisir une couleur personnalisee"
              value={value || '#BAE6FD'}
              onChange={e => onChange(e.target.value)}
              className="absolute top-9 left-0 w-8 h-8 p-0 border-0 cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
