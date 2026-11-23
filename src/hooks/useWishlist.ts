import { useState, useEffect, useCallback, useMemo } from 'react';
import { WishItem, CreateWishInput, UpdateWishInput, WishlistTab } from '../types/wishlist';
import { wishlistService } from '../services/wishlistService';
import { requestsService } from '../services/requestsService';
import { CoupleProfile, User } from '../types/couple';
import { capture } from '../lib/posthog';

export function useWishlist() {
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [items, setItems] = useState<WishItem[]>([]);
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
    if (!silent && !wishlistService.hasCachedData() && !profile) {
      setIsLoading(true);
    }
    try {
      const [profData, wishlistData] = await Promise.all([
        requestsService.getProfile(),
        wishlistService.getWishlist(),
      ]);
      setProfile(profData);
      setItems(wishlistData);
    } catch (err) {
      console.error('Failed to load wishlist data', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      wishlistService.getWishlist().then((data) => setItems(data)).catch(() => {});
    };

    const handleSilentReload = () => {
      loadData(true);
    };

    window.addEventListener('lovia_wishlist_updated', handleUpdate);
    window.addEventListener('lovia_couple_connected', handleSilentReload);
    window.addEventListener('lovia_couple_updated', handleSilentReload);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        wishlistService.getWishlist().then((data) => setItems(data)).catch(() => {});
      }
    }, 18000);

    return () => {
      window.removeEventListener('lovia_wishlist_updated', handleUpdate);
      window.removeEventListener('lovia_couple_connected', handleSilentReload);
      window.removeEventListener('lovia_couple_updated', handleSilentReload);
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

  // Handlers
  const handleCreateWish = async (input: CreateWishInput) => {
    const created = await wishlistService.createWishItem(currentUserId, input);
    setItems((prev) => [created, ...prev]);
    setIsCreateModalOpen(false);
    capture('wishlist_item_created', {
      has_link: Boolean(created.linkUrl),
      has_price: Boolean(created.estimatedPrice),
    });
    return created;
  };

  const handleUpdateWish = async (id: string, input: UpdateWishInput) => {
    const updated = await wishlistService.updateWishItem(id, currentUserId, input);
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    setEditingWish(null);
    capture('wishlist_item_updated');
    return updated;
  };

  const handleDeleteWish = async (id: string) => {
    await wishlistService.deleteWishItem(id, currentUserId);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeletingWish(null);
    capture('wishlist_item_deleted');
    return true;
  };

  const handleToggleReserve = async (id: string) => {
    const updated = await wishlistService.toggleReserveWishItem(id, currentUserId);
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    capture('wishlist_item_reservation_changed', {
      reserved: Boolean(updated.isReserved),
    });
    return updated;
  };

  const handleResetToMock = async () => {
    const reset = await wishlistService.resetToMock();
    setItems(reset);
  };

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
