import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { cx } from "@/shared/lib/cx";
import { useFieldControl } from "./Field";
import type { SelectOption } from "./Select";
import styles from "./Control.module.css";
import { tr } from "@/shared/i18n/tr";

interface SearchSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  "aria-label"?: string;
}

// Bỏ dấu tiếng Việt để gõ "ngua" vẫn ra "Ngựa".
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

// Ô chọn có tìm kiếm: bấm vào hiện toàn bộ danh sách (cuộn được), gõ để lọc ngay.
// Tùy chọn có value rỗng ("— Chọn ngựa —") chỉ dùng làm placeholder, không nằm trong danh sách.
export function SearchSelect({ options, value, onChange, placeholder, disabled, invalid, id, ...aria }: SearchSelectProps) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const blank = options.find((o) => o.value === "");
  const items = options.filter((o) => o.value !== "");
  const selected = items.find((o) => o.value === value);
  const q = fold(query.trim());
  const shown = q ? items.filter((o) => fold(tr(o.label)).includes(q)) : items;

  // Danh sách nằm trong portal (position: fixed) để không bị cắt bởi Modal/Card có overflow.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => setRect(inputRef.current?.getBoundingClientRect() ?? null);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function show() {
    if (disabled || open) return;
    setQuery("");
    setActive(Math.max(0, items.findIndex((o) => o.value === value)));
    setOpen(true);
  }
  function pick(o: SelectOption) {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return show();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => Math.min(shown.length - 1, Math.max(0, i + step)));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if (e.key === "Escape" && open) {
      // Đóng danh sách trước, không để Esc đóng luôn Modal bên ngoài.
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      setOpen(false);
    }
  }

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const up = rect != null && spaceBelow < 240 && rect.top > spaceBelow;

  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>
        <Icon name="search" size={15} />
      </span>
      <input
        ref={inputRef}
        id={id ?? field?.id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        aria-label={aria["aria-label"]}
        autoComplete="off"
        disabled={disabled}
        className={cx(styles.control, styles.withIcon, styles.select, isInvalid && styles.invalid)}
        placeholder={selected ? tr(selected.label) : tr(placeholder ?? blank?.label ?? "Search horses")}
        value={open ? query : selected ? tr(selected.label) : ""}
        onFocus={show}
        onClick={show}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      <span className={styles.chevron}>
        <Icon name="chevronDown" size={15} />
      </span>
      {open && rect &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className={styles.listbox}
            style={{
              left: rect.left,
              width: rect.width,
              ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
            }}
            // Giữ focus ở ô nhập khi bấm/kéo thanh cuộn của danh sách.
            onMouseDown={(e) => e.preventDefault()}
          >
            {shown.length === 0 ? (
              <li className={styles.optionEmpty}>{tr("No matches")}</li>
            ) : (
              shown.map((o, i) => (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={o.value === value}
                  aria-disabled={o.disabled || undefined}
                  className={cx(styles.option, i === active && styles.optionActive)}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                >
                  {tr(o.label)}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
