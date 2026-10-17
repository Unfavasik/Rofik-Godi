import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContactSupportView } from '../src/components/ContactSupportView';

describe('ContactSupportView', () => {
  it('renders a full-page support center with WhatsApp, phone, email, and the request form', () => {
    const html = renderToStaticMarkup(
      <ContactSupportView currentUserId="customer-1" isAuthenticated={false} onBack={() => undefined} />,
    );

    expect(html).toContain('min-h-dvh w-full');
    expect(html).toContain('Contact Support');
    expect(html).toContain('https://wa.me/919832145678');
    expect(html).toContain('tel:+919832145678');
    expect(html).toContain('mailto:support@rofikgodi.com');
    expect(html).toContain('Visit the workshop');
    expect(html).toContain('Sign in to continue');
  });
});
