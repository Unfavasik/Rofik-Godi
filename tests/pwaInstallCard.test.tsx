import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PwaInstallCard, type PwaInstallCardProps } from '../src/components/PwaInstallCard';

const renderCard = (overrides: Partial<PwaInstallCardProps> = {}) => renderToStaticMarkup(
  <PwaInstallCard
    visible
    canInstall
    isIOSSafari={false}
    isInstalling={false}
    installError={null}
    onInstall={() => {}}
    onDismiss={() => {}}
    {...overrides}
  />,
);

describe('PWA install card', () => {
  it('offers a native install button and a 44px-target dismissal control', () => {
    const html = renderCard();
    expect(html).toContain('Install app');
    expect(html).toContain('aria-label="Dismiss install app card"');
    expect(html).toContain('min-h-11');
  });

  it('shows the iOS Safari Add to Home Screen hint when no prompt exists', () => {
    const html = renderCard({ canInstall: false, isIOSSafari: true });
    expect(html).toContain('Share → Add to Home Screen');
    expect(html).not.toContain('>Install app</button>');
  });

  it('renders nothing when the app is already installed or the card is dismissed', () => {
    expect(renderCard({ visible: false })).toBe('');
  });
});
