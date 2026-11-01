import { useState, useSyncExternalStore } from "react";
import { tr } from "@/shared/i18n/tr";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Tabs } from "@/shared/components/ui/Tabs";
import { AssistantChat } from "@/shared/components/mascot/AssistantChat";
import { AssistantInbox } from "@/shared/components/mascot/AssistantInbox";
import { getNotifications, subscribeNotifications } from "@/shared/lib/notifications";
import styles from "./AssistantPage.module.css";

// Trang Trợ lý TMEC (mọi vai trò): cùng hội thoại với bảng linh vật, khung cao cố định để trang không kéo dài.
export default function AssistantPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"chat" | "inbox">("chat");
  const unreadCount = useSyncExternalStore(subscribeNotifications, getNotifications).filter((n) => !n.read).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title={tr("TMEC Assistant")}
        description={tr("Ask about your horses, shifts, supplies or costs. Numbers come straight from the system.")}
      />
      <Tabs
        label="TMEC Assistant"
        active={tab}
        onChange={setTab}
        items={[
          { id: "chat", label: "Chat" },
          { id: "inbox", label: "Needs attention", count: unreadCount || undefined },
        ]}
      />
      <section className={styles.card}>
        {tab === "chat" ? <AssistantChat role={user?.role ?? "GROOM"} variant="page" /> : <AssistantInbox limit={20} />}
      </section>
    </div>
  );
}
