import { Button } from "./Button";
import styles from "./Pagination.module.css";
import { tr } from "@/shared/i18n/tr";
import { Fragment, type ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePaged } from "@/shared/lib/hooks";

interface PaginationProps {
  page: number; // bắt đầu từ 1
  pageSize: number;
  total: number;
  noun: string; // "accounts"
  onPage: (page: number) => void;
}

// Chân bảng: "Showing 1–7 of 7 accounts" + nút trang. Nút bị chặn ở trang đầu/cuối vẫn hiện, kèm lý do.
export function Pagination({ page, pageSize, total, noun, onPage }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from(new Set([1, page - 1, page, page + 1, pageCount]))
    .filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const singular = noun.endsWith("s") ? noun.slice(0, -1) : noun;

  const summary =
    total === 0
      ? tr("No {{noun}} match this filter", { noun: tr(noun) })
      : total === 1
        ? tr("Showing 1 {{singular}}", { singular: tr(singular) })
        : tr("Showing {{from}}–{{to}} of {{total}} {{noun}}", { from, to, total, noun: tr(noun) });

  return (
    <div className={styles.bar}>
      <span className={styles.summary}>{summary}</span>
      <nav className={styles.buttons} aria-label={tr("Pagination")}>
        <Button
          tone="secondary"
          size="sm"
          icon="chevronLeft"
          aria-label={tr("Previous page")}
          blockedReason={page <= 1 ? tr("This is the first page.") : undefined}
          onClick={() => onPage(page - 1)}
        />
        {pages.map((p, index) => (
          <Fragment key={p}>
          {index > 0 && p - pages[index - 1] > 1 && <span aria-hidden="true">…</span>}
          <Button
            tone={p === page ? "primary" : "secondary"}
            size="sm"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPage(p)}
          >
            {p}
          </Button>
          </Fragment>
        ))}
        <Button
          tone="secondary"
          size="sm"
          icon="chevronRight"
          aria-label={tr("Next page")}
          blockedReason={page >= pageCount ? tr("This is the last page.") : undefined}
          onClick={() => onPage(page + 1)}
        />
      </nav>
    </div>
  );
}

// Bọc một danh sách đã tải trọn: children nhận đúng các mục của trang hiện tại, chân phân trang hiện khi vượt pageSize.
export function Paged<T>({ items, pageSize = 10, noun, children, highlightIndex = -1 }: { items: readonly T[]; pageSize?: number; noun: string; children: (pageItems: T[]) => ReactNode; highlightIndex?: number }) {
  const pager = usePaged(items, pageSize);
  const targetPage = highlightIndex < 0 ? null : Math.floor(highlightIndex / pageSize) + 1;
  useEffect(() => {
    if (targetPage !== null && pager.page !== targetPage) {
      pager.setPage(targetPage);
    }
  }, [targetPage, pager.page, pager.setPage]);
  return (
    <>
      {children(pager.items)}
      {pager.paged && <Pagination page={pager.page} pageSize={pager.pageSize} total={pager.total} noun={noun} onPage={pager.setPage} />}
    </>
  );
}
