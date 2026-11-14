import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PrivacyPolicyView } from '../src/components/PrivacyPolicyView';
import { TermsConditionsView } from '../src/components/TermsConditionsView';
import { WORKSHOP_INFO } from '../src/data/products';

describe('Privacy Policy & Terms & Conditions content and UI/UX upgrade', () => {
  it('renders PrivacyPolicyView with unified light slate & crimson theme, all 9 sections, store contact, and cross-links', () => {
    const html = renderToStaticMarkup(
      <PrivacyPolicyView
        onBack={vi.fn()}
        onOpenStoreInfo={vi.fn()}
        onOpenTerms={vi.fn()}
        onOpenDeleteAccount={vi.fn()}
        onOpenPersonalData={vi.fn()}
      />,
    );

    expect(html).toContain('bg-[#F8FAFC]');
    expect(html).toContain('text-[#D9232D]');
    expect(html).toContain('select-text');
    expect(html).not.toContain('#065F46');
    expect(html).not.toContain('Updated Oct 2026');
    expect(html).not.toContain('border-l-4');

    // Hero, search, expand all, persistent top quick jump
    expect(html).toContain('Updated November 2026');
    expect(html).toContain('9 sections');
    expect(html).toContain('type="search"');
    expect(html).toContain('Showing 9 of 9');
    expect(html).toContain('Expand all');
    expect(html).toContain('aria-label="Quick Jump navigation"');
    expect(html).toContain('Quick Jump');
    expect(html).toContain('aria-current="location"');
    expect(html).toContain('scroll-mt-32');

    // Quick Jump lives inside the persistent sticky header above <main>
    const headerQuickJumpPos = html.indexOf('aria-label="Quick Jump navigation"');
    const mainPos = html.indexOf('<main');
    expect(headerQuickJumpPos).toBeGreaterThan(-1);
    expect(headerQuickJumpPos).toBeLessThan(mainPos);

    // All 9 policy sections
    expect(html).toContain('Information We Collect');
    expect(html).toContain('Profile Photos &amp; Support Media Uploads');
    expect(html).toContain('Device Storage, Cache &amp; Push Notifications');
    expect(html).toContain('How We Use Your Information');
    expect(html).toContain('Payment &amp; Security Safeguards');
    expect(html).toContain('Service Providers &amp; Zero-Sale Guarantee');
    expect(html).toContain('Data Retention &amp; Expiry Periods');
    expect(html).toContain('Your Rights &amp; 7-Day Account Deletion');
    expect(html).toContain('Age Eligibility, Updates &amp; Grievance Contact');

    // Live workshop info + cross-links + accessible touch targets
    expect(html).toContain(WORKSHOP_INFO.name);
    expect(html).toContain(WORKSHOP_INFO.email);
    expect(html).toContain(WORKSHOP_INFO.phone);
    expect(html).toContain(WORKSHOP_INFO.workingHours);
    expect(html).toContain('View Store Map &amp; Hours');
    expect(html).toContain('Read Terms &amp; Conditions');
    expect(html).toContain('Manage or Delete Account');
    expect(html).toContain('h-11 w-11');
    expect(html).toContain('min-h-11');
    expect(html).toContain('tabular-nums');
  });

  it('renders TermsConditionsView with all 11 updated legal & operational sections and persistent top Quick Jump', () => {
    const html = renderToStaticMarkup(
      <TermsConditionsView
        onBack={vi.fn()}
        onOpenStoreInfo={vi.fn()}
        onOpenPrivacy={vi.fn()}
        onOpenDeleteAccount={vi.fn()}
      />,
    );

    expect(html).toContain('bg-[#F8FAFC]');
    expect(html).toContain('select-text');
    expect(html).not.toContain('select-none');
    expect(html).not.toContain('1 September 2025');
    expect(html).not.toContain('fraudulent COD orders');

    // Hero, search, expand all, persistent top quick jump
    expect(html).toContain('Updated November 2026');
    expect(html).toContain('11 sections');
    expect(html).toContain('Showing 11 of 11');
    expect(html).toContain('Expand all');
    expect(html).toContain('aria-label="Quick Jump navigation"');
    expect(html).toContain('Quick Jump');
    expect(html).toContain('aria-current="location"');
    expect(html).toContain('scroll-mt-32');

    // Quick Jump lives inside the persistent sticky header above <main>
    const headerQuickJumpPos = html.indexOf('aria-label="Quick Jump navigation"');
    const mainPos = html.indexOf('<main');
    expect(headerQuickJumpPos).toBeGreaterThan(-1);
    expect(headerQuickJumpPos).toBeLessThan(mainPos);

    // All 11 sections
    expect(html).toContain('Acceptance &amp; Scope of Terms');
    expect(html).toContain('Products, Custom Tailoring &amp; Embroidery Rules');
    expect(html).toContain('Pricing, Coupons &amp; Promotional Offers');
    expect(html).toContain('Orders, Razorpay Online Payment &amp; Pay at Workshop');
    expect(html).toContain('Workshop Pickup, Verification &amp; Hold Window');
    expect(html).toContain('Cancellations, Returns &amp; Refunds');
    expect(html).toContain('Account Conduct, Reviews &amp; Customer Content');
    expect(html).toContain('Intellectual Property &amp; Brand Assets');
    expect(html).toContain('Service Availability &amp; Limitation of Liability');
    expect(html).toContain('Updates to These Terms');
    expect(html).toContain('Governing Law, Disputes &amp; Workshop Contact');

    // Store info & cross-links
    expect(html).toContain('View Store Map &amp; Hours');
    expect(html).toContain('Read Privacy Policy');
    expect(html).toContain('Manage or Delete Account');
  });

  it('contains concrete missing disclosures in source data (FCM, avatars/support attachments, Razorpay, 14-day hold, Murshidabad jurisdiction)', () => {
    const privacySrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/PrivacyPolicyView.tsx'),
      'utf8',
    );
    const termsSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/TermsConditionsView.tsx'),
      'utf8',
    );
    const layoutSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/LegalDocumentLayout.tsx'),
      'utf8',
    );

    // Privacy data coverage checks
    expect(privacySrc).toContain('Firebase Cloud Messaging (FCM)');
    expect(privacySrc).toContain('support-attachments');
    expect(privacySrc).toContain('My Fitment Garage');
    expect(privacySrc).toContain('7-day grace period');
    expect(privacySrc).toContain('Razorpay Checkout');

    // Terms data coverage checks
    expect(termsSrc).toContain('14 days');
    expect(termsSrc).toContain('Pickup QR');
    expect(termsSrc).toContain('Murshidabad, West Bengal');
    expect(termsSrc).toContain('3–5 working banking days');
    expect(termsSrc).toContain('up to 12 characters');
    expect(termsSrc).toContain('rexine/leatherette surface peeling');
    expect(termsSrc).toContain('cat or animal claw scratches');
    expect(termsSrc).toContain('blade or knife cuts');
    expect(termsSrc).toContain('fire or burn marks');

    // Layout accessibility, persistent sticky Quick Jump, & smooth scroll checks
    expect(layoutSrc).toContain('Collapse all');
    expect(layoutSrc).toContain('Reset search');
    expect(layoutSrc).toContain('Clear search');
    expect(layoutSrc).toContain('scrollIntoView');
    expect(layoutSrc).toContain('IntersectionObserver');
    expect(layoutSrc).toContain('prefers-reduced-motion');
  });
});
