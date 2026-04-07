import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../shared/constants';
import { buildPlayerSeats } from '../renderer/state/app-state';

describe('buildPlayerSeats', () => {
  it('assigns the current local profile to the first seat and AI to the remaining seats for single-player setup', () => {
    const profile = {
      ...defaultProfile(),
      id: 'profile-primary',
      displayName: 'Jade',
      avatarAsset: 'data:image/png;base64,avatar',
    };

    const seats = buildPlayerSeats(profile, 'tic-tac-toe', 'single', 2, true);

    expect(seats[0]).toMatchObject({
      name: 'Jade',
      type: 'human',
      profileId: 'profile-primary',
      avatarAsset: 'data:image/png;base64,avatar',
      isLocal: true,
    });
    expect(seats[1]).toMatchObject({
      name: 'Nexus AI',
      type: 'ai',
      profileId: null,
      isLocal: false,
    });
  });
});
