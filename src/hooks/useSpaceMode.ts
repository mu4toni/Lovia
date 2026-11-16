import { useState, useEffect } from 'react';
import { coupleService, SpaceType } from '../services/coupleService';

export interface SpaceModeInfo {
  spaceType: SpaceType;
  isFriendship: boolean;
  isRelationship: boolean;
}

export function useSpaceMode(): SpaceModeInfo {
  const [spaceType, setSpaceType] = useState<SpaceType>(() => coupleService.getSpaceType());

  useEffect(() => {
    const handleUpdate = () => {
      setSpaceType(coupleService.getSpaceType());
    };

    window.addEventListener('lovia_couple_connected', handleUpdate);
    window.addEventListener('lovia_couple_updated', handleUpdate);
    window.addEventListener('lovia_couple_dissolved', handleUpdate);

    return () => {
      window.removeEventListener('lovia_couple_connected', handleUpdate);
      window.removeEventListener('lovia_couple_updated', handleUpdate);
      window.removeEventListener('lovia_couple_dissolved', handleUpdate);
    };
  }, []);

  return {
    spaceType,
    isFriendship: spaceType === 'friendship',
    isRelationship: spaceType === 'relationship',
  };
}
