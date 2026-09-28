import { useLayoutEffect, useRef, useState } from "react";
import { getTopping, getToppingLabel } from "../features/meals/toppings";

interface MealToppingChipsProps {
  ids: readonly string[];
  maxVisible?: number;
  onRemove?: (id: string) => void;
  singleLine?: boolean;
}

export function MealToppingChips({ ids, maxVisible, onRemove, singleLine = false }: MealToppingChipsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chipMeasureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const moreMeasureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [visibleCount, setVisibleCount] = useState(maxVisible ? Math.min(maxVisible, ids.length) : ids.length);

  useLayoutEffect(() => {
    if (!singleLine || !containerRef.current) return;

    const container = containerRef.current;
    const fitItems = () => {
      const width = container.clientWidth;
      if (!width) return;

      const maxCount = maxVisible ? Math.min(maxVisible, ids.length) : ids.length;
      const gap = 6;
      for (let count = maxCount; count >= 0; count -= 1) {
        const hiddenCount = ids.length - count;
        const chipWidth = chipMeasureRefs.current
          .slice(0, count)
          .reduce((total, item) => total + (item?.offsetWidth ?? 0), 0);
        const moreWidth = hiddenCount > 0 ? moreMeasureRefs.current[hiddenCount]?.offsetWidth ?? 0 : 0;
        const gapCount = Math.max(0, count - 1) + (hiddenCount > 0 && count > 0 ? 1 : 0);
        if (chipWidth + moreWidth + gap * gapCount <= width) {
          setVisibleCount(count);
          return;
        }
      }
      setVisibleCount(0);
    };

    fitItems();
    const observer = new ResizeObserver(fitItems);
    observer.observe(container);
    return () => observer.disconnect();
  }, [ids, maxVisible, singleLine]);

  if (!ids.length) return null;
  const visibleIds = singleLine
    ? ids.slice(0, visibleCount)
    : maxVisible ? ids.slice(0, maxVisible) : ids;
  const hiddenCount = ids.length - visibleIds.length;

  return (
    <div ref={containerRef} className={`meal-topping-chips${singleLine ? " meal-topping-chips-single-line" : ""}`} aria-label="토핑 조합">
      {visibleIds.map((id) => {
        const item = getTopping(id);
        const label = getToppingLabel(id);
        const content = <>{item ? <img src={`/icons/toppings/${id}.svg`} alt="" /> : null}<span>{label}</span></>;
        return onRemove ? (
          <button type="button" key={id} onClick={() => onRemove(id)} aria-label={`${label} 선택 해제`}>{content}<span aria-hidden="true">×</span></button>
        ) : <span className="meal-topping-chip" key={id}>{content}</span>;
      })}
      {hiddenCount > 0 ? (
        <span className="meal-topping-chip meal-topping-more">+{hiddenCount}개</span>
      ) : null}
      {singleLine ? (
        <div className="meal-topping-measure" aria-hidden="true">
          {ids.slice(0, maxVisible ? Math.min(maxVisible, ids.length) : ids.length).map((id, index) => (
            <span className="meal-topping-chip" key={`${id}-${index}`} ref={(element) => { chipMeasureRefs.current[index] = element; }}>
              {getTopping(id) ? <img src={`/icons/toppings/${id}.svg`} alt="" /> : null}
              <span>{getToppingLabel(id)}</span>
            </span>
          ))}
          {ids.map((_, index) => {
            const count = index + 1;
            return (
              <span className="meal-topping-chip meal-topping-more" key={`more-${count}`} ref={(element) => { moreMeasureRefs.current[count] = element; }}>
                +{count}개
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
