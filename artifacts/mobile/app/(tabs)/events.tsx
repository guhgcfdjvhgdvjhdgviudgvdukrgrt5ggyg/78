import { Feather } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import type { Announcement, Event } from "@/types";

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<"event" | "announcement">("event");

  const [eTitle, setETitle] = useState("");
  const [eDate, setEDate] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eLink, setELink] = useState("");
  const [saving, setSaving] = useState(false);

  const canManage =
    profile?.role === "admin" || profile?.role === "moderator";

  useEffect(() => {
    const evQ = query(collection(db, "events"), orderBy("date", "asc"));
    const unsubEv = onSnapshot(evQ, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event)));
    });

    const annQ = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );
    const unsubAnn = onSnapshot(annQ, (snap) => {
      setAnnouncements(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement))
      );
      setLoading(false);
    });
    return () => {
      unsubEv();
      unsubAnn();
    };
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    if (createType === "event") {
      if (!eTitle.trim() || !eDate.trim()) {
        Alert.alert("Missing Fields", "Title and date are required.");
        return;
      }
      const dateTs = new Date(eDate).getTime();
      if (isNaN(dateTs)) {
        Alert.alert("Invalid Date", "Please enter a valid date (e.g. 2025-12-31T18:00).");
        return;
      }
      setSaving(true);
      await addDoc(collection(db, "events"), {
        title: eTitle.trim(),
        date: dateTs,
        description: eDesc.trim(),
        link: eLink.trim(),
        createdBy: profile.uid,
      });
    } else {
      if (!eTitle.trim()) {
        Alert.alert("Missing Fields", "Title is required.");
        return;
      }
      setSaving(true);
      await addDoc(collection(db, "announcements"), {
        title: eTitle.trim(),
        body: eDesc.trim(),
        createdAt: Date.now(),
        pinned: true,
      });
    }
    setETitle("");
    setEDate("");
    setEDesc("");
    setELink("");
    setSaving(false);
    setShowCreate(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 4,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Events
        </Text>
        {canManage && (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={styles.headerBtn}
          >
            <Feather name="plus" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        >
          {announcements.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                ANNOUNCEMENTS
              </Text>
              {announcements.map((ann) => (
                <View
                  key={ann.id}
                  style={[
                    styles.announcementCard,
                    {
                      backgroundColor: colors.secondary,
                      borderRadius: colors.radius,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.annHeader}>
                    <Feather name="megaphone" size={16} color={colors.primary} />
                    <Text style={[styles.annTitle, { color: colors.primary }]}>
                      {ann.title}
                    </Text>
                    {canManage && (
                      <TouchableOpacity
                        onPress={() =>
                          deleteDoc(doc(db, "announcements", ann.id))
                        }
                        style={styles.deleteBtn}
                      >
                        <Feather
                          name="x"
                          size={16}
                          color={colors.mutedForeground}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  {ann.body ? (
                    <Text
                      style={[styles.annBody, { color: colors.foreground }]}
                    >
                      {ann.body}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {events.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                UPCOMING EVENTS
              </Text>
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  canEdit={canManage}
                  onDelete={(id) => deleteDoc(doc(db, "events", id))}
                />
              ))}
            </View>
          )}

          {events.length === 0 && announcements.length === 0 && (
            <View style={[styles.center, { marginTop: 80 }]}>
              <Feather name="calendar" size={40} color={colors.border} />
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                No events or announcements yet
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.background,
              paddingTop: Platform.OS === "ios" ? 0 : insets.top + 10,
            },
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <View style={styles.modalTabs}>
              {(["event", "announcement"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setCreateType(t)}
                  style={[
                    styles.modalTab,
                    createType === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalTabText,
                      { color: createType === t ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {t === "event" ? "Event" : "Announcement"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : "Create"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>
              TITLE
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  borderRadius: 20,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="Title..."
              placeholderTextColor={colors.mutedForeground}
              value={eTitle}
              onChangeText={setETitle}
            />
            {createType === "event" && (
              <>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>
                  DATE & TIME (e.g. 2025-12-31T18:00)
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderRadius: 20,
                      backgroundColor: colors.card,
                    },
                  ]}
                  placeholder="2025-12-31T18:00"
                  placeholderTextColor={colors.mutedForeground}
                  value={eDate}
                  onChangeText={setEDate}
                />
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>
                  JOIN LINK (optional)
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderRadius: 20,
                      backgroundColor: colors.card,
                    },
                  ]}
                  placeholder="https://..."
                  placeholderTextColor={colors.mutedForeground}
                  value={eLink}
                  onChangeText={setELink}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </>
            )}
            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>
              DESCRIPTION
            </Text>
            <TextInput
              style={[
                styles.formTextarea,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="Description..."
              placeholderTextColor={colors.mutedForeground}
              value={eDesc}
              onChangeText={setEDesc}
              multiline
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  headerBtn: { padding: 4 },
  section: { marginTop: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  announcementCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderWidth: 0.5,
  },
  annHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  annTitle: { fontWeight: "700", fontSize: 14, flex: 1 },
  annBody: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  deleteBtn: { padding: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  cancelText: { fontSize: 15 },
  modalTabs: { flexDirection: "row", gap: 0 },
  modalTab: { paddingHorizontal: 10, paddingVertical: 4 },
  modalTabText: { fontSize: 14, fontWeight: "600" },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 14,
  },
  formInput: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 0.5,
  },
  formTextarea: {
    height: 100,
    padding: 14,
    fontSize: 15,
    borderWidth: 0.5,
    textAlignVertical: "top",
  },
});
