'use client';

import React from 'react';
import { Footer16, Footer16Column, Footer16Social, Footer16Link } from '@/components/watermelon-ui/footer-16';

const unixlColumns: Footer16Column[] = [
  {
    title: 'Product',
    links: [
      { label: 'Visual DAG Studio', href: '/#interactive-showcase' },
      { label: 'Spreadsheet Grid Engine', href: '/#features' },
      { label: 'Desk Interface & Chat', href: '/#features' },
      { label: 'Workspace Files & Cloud', href: '/#features' },
      { label: 'Pricing Plans', href: '/pricing' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Attendance & Education', href: '/#use-cases' },
      { label: 'Payroll & Timesheets', href: '/#use-cases' },
      { label: 'Lead Deduplication', href: '/#use-cases' },
      { label: 'Inventory Audits', href: '/#use-cases' },
      { label: 'Enterprise Supply Chain', href: '/#use-cases' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation & Guides', href: '/help' },
      { label: 'Architecture Blueprint', href: '/#interactive-showcase' },
      { label: 'GitHub Repository', href: 'https://github.com/mohit-rajput-raj/f6' },
      { label: 'System Status (All Operational)', href: '/#faq' },
    ],
  },
];

const unixlLegalLinks: Footer16Link[] = [
  { label: 'Privacy Policy', href: '/#faq' },
  { label: 'Terms of Service', href: '/#faq' },
  { label: 'Security Overview', href: '/#faq' },
];

const unixlSocials: Footer16Social[] = [
  { label: 'Twitter', href: 'https://twitter.com', icon: 'twitter' },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: 'linkedin' },
  { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' },
  { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' },
];

export default function Footer() {
  return (
    <Footer16
      brandName="UNIXL"
      tagline="The visual DAG platform for operational spreadsheet automation,\nmulti-sheet reconciliations, and time-series enterprise analytics.\nEngineered for precision data operations."
      columns={unixlColumns}
      legalLinks={unixlLegalLinks}
      socials={unixlSocials}
      copyright={`© ${new Date().getFullYear()} UNIXL Technologies Inc. All rights reserved.`}
      backgroundImage="https://assets.watermelon.sh/footer-16-bg.avif"
    />
  );
}
