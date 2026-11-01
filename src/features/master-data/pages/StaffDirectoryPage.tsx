import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./StaffDirectoryPage.module.css";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/form/Input";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { listAccounts } from "@/features/accounts/api";
import type { PublicAccount, Role } from "@/shared/types/auth";
import { ROLE_LABEL } from "@/shared/lib/permissions";
import { ACCOUNT_STATUS } from "@/shared/lib/status";
import { initials } from "@/shared/lib/format";
import { Icon } from "@/shared/components/ui/Icon";

import { tr } from "@/shared/i18n/tr";
const STAFF_ROLES: Role[] = ["CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN", "GROOM"];

export default function StaffDirectoryPage() {
  useScreenTranslation();
  const currentUser = useCurrentUser();
  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");

  useEffect(() => {
    let active = true;
    listAccounts()
      .then((data) => {
        if (active) setAccounts(data.accounts);
      })
      .catch(() => {
        // Fallback gracefully
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const staffMembers = useMemo(() => {
    return accounts.filter((acc) => {
      if (!STAFF_ROLES.includes(acc.role)) return false;
      if (roleFilter !== "ALL" && acc.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          acc.fullName.toLowerCase().includes(q) ||
          acc.email.toLowerCase().includes(q) ||
          acc.phone.includes(q)
        );
      }
      return true;
    });
  }, [accounts, roleFilter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={tr("Staff Directory")}
        description={tr("Active operating staff, trainers, veterinarians, and grooms managing TMEC facilities.")}
        action={
          currentUser.permissions.manageAccounts ? (
            <LinkButton to="/accounts" tone="primary">
              {tr("+ Manage Accounts & Invites")}
            </LinkButton>
          ) : undefined
        }
      />

      <Card pad={16}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <Button
              size="sm"
              tone={roleFilter === "ALL" ? "primary" : "secondary"}
              aria-pressed={roleFilter === "ALL"}
              onClick={() => setRoleFilter("ALL")}
            >
              {tr("All Staff ({{count}})", { count: accounts.filter((a) => STAFF_ROLES.includes(a.role)).length })}
            </Button>
            {STAFF_ROLES.map((r) => (
              <Button
                key={r}
                size="sm"
                tone={roleFilter === r ? "primary" : "secondary"}
                aria-pressed={roleFilter === r}
                onClick={() => setRoleFilter(r)}
              >
                {tr("{{role}} ({{count}})", { role: tr(ROLE_LABEL[r]), count: accounts.filter((a) => a.role === r).length })}
              </Button>
            ))}
          </div>

          <div className={styles.search}>
            <Input
              aria-label={tr("Search staff by name, email...")}
              placeholder={tr("Search staff by name, email...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          {tr("Loading staff directory...")}
        </div>
      ) : staffMembers.length === 0 ? (
        <Card pad={32}>
          <EmptyState
            title={tr("No staff members found")}
            description={tr("No staff match your current filter or search criteria.")}
          />
        </Card>
      ) : (
        <div className={styles.directory}>
          {staffMembers.map((staff) => (
            <Card key={staff.id} pad={20}>
              <div className={styles.person}>
                <div className={styles.avatar} aria-hidden="true">{initials(staff.fullName)}</div>
                <div className={styles.details}>
                  <div className={styles.heading}>
                    <h3 className={styles.name}>{staff.fullName}</h3>
                    <Badge tone={ACCOUNT_STATUS[staff.status]?.tone || "neutral"}>
                      {ACCOUNT_STATUS[staff.status]?.label ? tr(ACCOUNT_STATUS[staff.status].label) : staff.status}
                    </Badge>
                  </div>
                  <p className={styles.role}>{tr(ROLE_LABEL[staff.role])}</p>
                  <div className={styles.contact}>
                    <div><Icon name="mail" size={16} /><a href={`mailto:${staff.email}`} className={styles.email}>{staff.email}</a></div>
                    {staff.phone && <div><Icon name="phone" size={16} /><span>{staff.phone}</span></div>}
                  </div>
                  {currentUser.permissions.manageAccounts && (
                    <div className={styles.footer}>
                      <Link to={`/accounts/${staff.id}/permissions`}>{tr("Permissions")} →</Link>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
