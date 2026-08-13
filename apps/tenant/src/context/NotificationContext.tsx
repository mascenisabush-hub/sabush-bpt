// Module #20 (Notifications), Phase 1 (Foundations) — NotificationContext.
//
// Read-only live Firestore listener, per the Rule 8 Assessment's own
// scoping (docs/engineering/20-phase1-foundations-rule8-assessment.md
// §3), plus the one narrowly-scoped write Phase 1's own working basis
// adopted (Implementation Plan §7, items 1-2; Phase 1 Authorization §3):
// `markAsRead`, a single-field `status` update matching exactly what
// `firestore.rules`' `/notifications/{notificationId}` update block
// (Checkpoint 2) permits and nothing more. Per POL-20-001, dismiss is
// coupled to read (Active -> Archived is derived, not a separate stored
// field or write) — so there is no separate `dismiss` method; the UI
// (Checkpoint 3, Header.tsx) calls this same function for both actions.
//
// Recipient scope (docs/specs/20-notifications.md §20.2, Decision
// Gate 1):
//   - Business-scoped notifications: visible to that Business's
//     Admin/Owner and a Manager on that Business (view-only), never
//     plain Staff.
//   - User-scoped notifications: visible only to the matching uid,
//     regardless of role.
// This context queries exactly those two scoped subsets — never an
// unscoped query against the top-level `notifications` collection
// (Rule 8 Assessment §6, Risk 1/2).
//
// `notifications` is this repo's first top-level (not business-nested)
// collection, per its own data model (20.1) — hence filtering by
// `where('businessId', ...)` / `where('userId', ...)` instead of a path
// segment, unlike every other collection in AppContext.tsx.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Notification } from '../types';
import { useApp } from './AppContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthLoading, activeBusinessId, isOwner, isManager } = useApp();

  const [businessScoped, setBusinessScoped] = useState<Notification[]>([]);
  const [userScoped, setUserScoped] = useState<Notification[]>([]);
  const [businessLoading, setBusinessLoading] = useState<boolean>(false);
  const [userLoading, setUserLoading] = useState<boolean>(false);

  // Business-scoped listener. Only set up for roles the spec actually
  // grants business-scoped visibility to (20.2) — a plain Staff account
  // (isStaff && !isManager) never subscribes to this query at all,
  // rather than relying on firestore.rules alone to hide the result.
  useEffect(() => {
    const canSeeBusinessScoped = (isOwner || isManager) && !!activeBusinessId;

    if (!canSeeBusinessScoped) {
      setBusinessScoped([]);
      setBusinessLoading(false);
      return;
    }

    setBusinessLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('scope', '==', 'business'),
      where('businessId', '==', activeBusinessId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Notification[] = [];
        snap.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as Notification));
        setBusinessScoped(list);
        setBusinessLoading(false);
      },
      (err) => {
        // Phase 1 has no firestore.rules block for this collection yet
        // (later checkpoint) — a permission-denied error here is
        // expected until that ships. Fails closed: empty list, no crash.
        console.error('Error fetching business-scoped notifications:', err);
        setBusinessScoped([]);
        setBusinessLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOwner, isManager, activeBusinessId]);

  // User-scoped listener. Every authenticated user gets their own,
  // regardless of role — 20.2's User-scoped visibility has no role
  // gate, unlike Business-scoped.
  useEffect(() => {
    const uid = currentUser?.uid;

    if (!uid) {
      setUserScoped([]);
      setUserLoading(false);
      return;
    }

    setUserLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('scope', '==', 'user'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Notification[] = [];
        snap.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as Notification));
        setUserScoped(list);
        setUserLoading(false);
      },
      (err) => {
        console.error('Error fetching user-scoped notifications:', err);
        setUserScoped([]);
        setUserLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Merge, most-recent-first. Two independently-sorted lists merged by
  // `createdAt` client-side — no single Firestore query can express an
  // OR across `businessId`/`userId` on this schema, so two listeners is
  // the correct shape here, not a workaround.
  const notifications = [...businessScoped, ...userScoped].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const unreadCount = notifications.filter((n) => n.status === 'unread').length;
  const isLoading = isAuthLoading || businessLoading || userLoading;

  // The one client-direct write this domain permits (firestore.rules
  // `/notifications/{notificationId}` update block, Checkpoint 2):
  // exactly the `status` field, nothing else. A no-op for an
  // already-read notification avoids an unnecessary write; errors are
  // logged, not thrown, so a denied/failed update never crashes the
  // dropdown it's called from.
  const markAsRead = async (notificationId: string) => {
    const target = notifications.find((n) => n.id === notificationId);
    if (!target || target.status === 'read') return;

    try {
      await updateDoc(doc(db, 'notifications', notificationId), { status: 'read' });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
