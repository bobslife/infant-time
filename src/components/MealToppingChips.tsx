import { getTopping, getToppingLabel } from "../features/meals/toppings";

interface MealToppingChipsProps {
  ids: readonly string[];
  maxVisible?: number;
  onRemove?: (id: string) => void;
}

export function MealToppingChips({ ids, maxVisible, onRemove }: MealToppingChipsProps) {
  if (!ids.length) return null;
  const visibleIds = maxVisible ? ids.slice(0, maxVisible) : ids;
  const hiddenCount = ids.length - visibleIds.length;

  return (
    <div className="meal-topping-chips" aria-label="토핑 조합">
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
    </div>
  );
}
