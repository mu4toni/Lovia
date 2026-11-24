import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WishItem, CreateWishInput, UpdateWishInput, WishlistTab } from '../types/wishlist';
import { wishlistService } from '../services/wishlistService';
import { requestsService } from '../services/requestsService';
import { CoupleProfile, User } from '../types/couple';

function dedupeWishItems(list: WishItem[]): WishItem[] {
  const seen = new Set<string>();
  const unique: WishItem[] = [];
  for (const item of list) {
    if (!item || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

export function useWishlist() {
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [items, setItems] = useState<WishItem[]>([]);
  const hasLoadedProfileRef = useRef(false);
  const [activeTab, setActiveTab] = useState<WishlistTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'partner') return 'partner';
    }
    return 'mine';
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingWish, setEditingWish] = useState<WishItem | null>(null);
  const [deletingWish, setDeletingWish] = useState<WishItem | null>(null);

  // Load profile and wishlist items
  const loadData = useCallback(async (silent = false) => {
    if (!silent && !wishlistService.hasCachedData() && !hasLoadedProfileRef.current) {
      setIsLoading(true);
    }
    try {
      const [profData, wishlistData] = await Promise.all([
        requestsService.getProfile(),
        wishlistService.getWishlist(),
      ]);
      hasLoadedProfileRef.current = true;
      setProfile(profData);
      setItems(dedupeWishItems(wishlistData));
    } catch (err) {
      console.error('Failed to load wishlist data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();

    const scheduleSilentReload = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        loadData(true);
      }, 45);
    };

    window.addEventListener('lovia_wishlist_updated', scheduleSilentReload);
    window.addEventListener('lovia_couple_connected', scheduleSilentReload);
    window.addEventListener('lovia_couple_updated', scheduleSilentReload);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        wishlistService
          .getWishlist()
          .then((data) => setItems(dedupeWishItems(data)))
          .catch(() => {});
      }
    }, 25000);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      window.removeEventListener('lovia_wishlist_updated', scheduleSilentReload);
      window.removeEventListener('lovia_couple_connected', scheduleSilentReload);
      window.removeEventListener('lovia_couple_updated', scheduleSilentReload);
      clearInterval(intervalId);
    };
  }, [loadData]);

  const currentUserId = profile?.user.id || 'user-marsel';
  const partnerId = profile?.partner?.id || 'user-alisa';

  // Count of items per person
  const myItemsCount = useMemo(() => {
    return items.filter((item) => item.userId === currentUserId).length;
  }, [items, currentUserId]);

  const partnerItemsCount = useMemo(() => {
    return items.filter((item) => item.userId === partnerId).length;
  }, [items, partnerId]);

  // Which list is currently active
  const isOwnList = activeTab === 'mine';

  const currentListOwner: User = useMemo(() => {
    if (isOwnList) {
      return (
        profile?.user || {
          id: 'user-marsel',
          name: 'Марсель',
          avatarUrl: undefined,
        }
      );
    } else {
      return (
        profile?.partner || {
          id: 'user-alisa',
          name: 'Алиса',
          avatarUrl: undefined,
        }
      );
    }
  }, [isOwnList, profile]);

  // Items for the current active list
  const activeListItems = useMemo(() => {
    const targetUserId = isOwnList ? currentUserId : partnerId;
    return items.filter((item) => item.userId === targetUserId);
  }, [items, isOwnList, currentUserId, partnerId]);

  // Filtered by category if selected
  const displayedItems = useMemo(() => {
    if (!selectedCategory) return activeListItems;
    return activeListItems.filter((item) => item.categoryId === selectedCategory);
  }, [activeListItems, selectedCategory]);

  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // Stable handlers (for React.memo WishCard children)
  const handleCreateWish = useCallback(async (input: CreateWishInput) => {
    const created = await wishlistService.createWishItem(currentUserIdRef.current, input);
    setItems((prev) =>
      dedupeWishItems(
        prev.some((item) => item.id === created.id)
          ? prev.map((item) => (item.id === created.id ? created : item))
          : [created, ...prev]
      )
    );
    setIsCreateModalOpen(false);
    return created;
  }, []);

  const handleUpdateWish = useCallback(async (id: string, input: UpdateWishInput) => {
    const updated = await wishlistService.updateWishItem(id, currentUserIdRef.current, input);
    setItems((prev) => dedupeWishItems(prev.map((item) => (item.id === id ? updated : item))));
    setEditingWish(null);
    return updated;
  }, []);

  const handleDeleteWish = useCallback(async (id: string) => {
    await wishlistService.deleteWishItem(id, currentUserIdRef.current);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeletingWish(null);
    return true;
  }, []);

  const handleToggleReserve = useCallback(async (id: string) => {
    const updated = await wishlistService.toggleReserveWishItem(id, currentUserIdRef.current);
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  const handleResetToMock = useCallback(async () => {
    const reset = await wishlistService.resetToMock();
    setItems(reset);
  }, []);

  return {
    profile,
    items,
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    isOwnList,
    currentUserId,
    currentListOwner,
    displayedItems,
    myItemsCount,
    partnerItemsCount,
    isCreateModalOpen,
    setIsCreateModalOpen,
    editingWish,
    setEditingWish,
    deletingWish,
    setDeletingWish,
    handleCreateWish,
    handleUpdateWish,
    handleDeleteWish,
    handleToggleReserve,
    handleResetToMock,
    reload: loadData,
  };
}
