import React from "react";

type Props = {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  x: number;
  y: number;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
};

export default function SkillNode({ id, name, level, maxLevel, x, y, onIncrease, onDecrease }: Props) {
  const size = 64;
  const style: React.CSSProperties = {
    position: "absolute",
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    borderRadius: 8,
    background: level > 0 ? "#ffd27f" : "#333",
    color: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none"
  };

  return (
    <div style={style} title={`${name} (nivel ${level}/${maxLevel})`}>
      <div style={{ textAlign: "center", fontSize: 12 }}>
        <div>{name}</div>
        <div style={{ marginTop: 4 }}>
          <button onClick={(e) => { e.stopPropagation(); onDecrease(id); }} disabled={level <= 0}>-</button>
          <span style={{ margin: "0 6px" }}>{level}</span>
          <button onClick={(e) => { e.stopPropagation(); onIncrease(id); }} disabled={level >= maxLevel}>+</button>
        </div>
      </div>
    </div>
  );
}