'use client';

import LogoIcon from './logo-icon';
import { motion, type Variants } from 'motion/react';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
} from 'react-icons/fa6';

export interface Footer16Link {
  label: string;
  href: string;
}

export interface Footer16Column {
  title: string;
  links: Footer16Link[];
}

export interface Footer16Social {
  label: string;
  href: string;
  icon: 'facebook' | 'twitter' | 'instagram' | 'linkedin';
}

export interface Footer16Props {
  brandName?: string;
  tagline?: string;
  columns?: Footer16Column[];
  legalLinks?: Footer16Link[];
  socials?: Footer16Social[];
  copyright?: string;
  backgroundImage?: string;
}

const defaultColumns: Footer16Column[] = [
  {
    title: 'Product',
    links: [
      { label: 'Visual DAG Pipeline', href: '#features' },
      { label: 'Spreadsheet Grid Engine', href: '#features' },
      { label: 'Live Formulas & Calculations', href: '#features' },
      { label: 'Enterprise Security', href: '#security' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Operations & Logistics', href: '#solutions' },
      { label: 'Payroll & Compensation', href: '#solutions' },
      { label: 'Attendance Automation', href: '#solutions' },
      { label: 'Academic & Universities', href: '#solutions' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/help' },
      { label: 'Architecture Blueprint', href: '#blueprint' },
      { label: 'System Telemetry', href: '#telemetry' },
      { label: 'Status & Uptime', href: '#' },
    ],
  },
];

const defaultLegalLinks: Footer16Link[] = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Security & Compliance', href: '#' },
];

const defaultSocials: Footer16Social[] = [
  { label: 'Facebook', href: '#', icon: 'facebook' },
  { label: 'Twitter', href: '#', icon: 'twitter' },
  { label: 'Instagram', href: '#', icon: 'instagram' },
  { label: 'LinkedIn', href: '#', icon: 'linkedin' },
];

const backgroundUrl = 'https://assets.watermelon.sh/footer-16-bg.avif';

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

const wordmarkVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', duration: 1.1, bounce: 0 },
  },
};

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', duration: 0.65, bounce: 0 },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
    },
  },
};

const linkVariants: Variants = {
  hidden: { opacity: 0, y: 7 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', duration: 0.42, bounce: 0 },
  },
};

const socialIcons = {
  facebook: FaFacebookF,
  twitter: FaXTwitter,
  instagram: FaInstagram,
  linkedin: FaLinkedinIn,
};

export function Footer16({
  brandName = 'UNIXL',
  tagline = 'Change your data operations today with visual DAG pipelines\nand enterprise spreadsheet orchestration engine.\nEverything you need starts here.',
  columns = defaultColumns,
  legalLinks = defaultLegalLinks,
  socials = defaultSocials,
  copyright = '© 2026 UNIXL Orchestration Engine. All rights reserved.',
  backgroundImage = backgroundUrl,
}: Footer16Props) {
  return (
    <footer className="relative w-full overflow-hidden bg-zinc-950 font-sans text-zinc-100 antialiased border-t border-zinc-800/80">
      <div
        className="absolute inset-0 z-10 bg-cover bg-center sm:-translate-y-16 opacity-35"
        style={{ backgroundImage: `url(${backgroundImage})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,14,0.75)_0%,rgba(9,10,14,0.4)_42%,rgba(9,10,14,0.85)_68%,rgba(9,10,14,0.98)_100%)]"
        aria-hidden="true"
      />

      <motion.div
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.22 }}
        className="relative mx-auto flex min-h-[580px] flex-col justify-end pt-16 sm:min-h-[640px] lg:min-h-[720px]"
      >
        <motion.div
          variants={wordmarkVariants}
          className="pointer-events-none absolute top-[36%] left-1/2 flex w-[118vw] -translate-x-1/2 justify-center overflow-hidden sm:top-[16%] lg:top-[10%]"
          aria-hidden="true"
        >
          <svg
            className="h-auto w-full select-none"
            viewBox={`0 0 ${Math.max(brandName.length * 90, 400)} 160`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={brandName}
          >
            <defs>
              <linearGradient id="brandGrad16" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#52525b" />
                <stop offset="100%" stopColor="#18181b" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="50%"
              dominantBaseline="alphabetic"
              textAnchor="middle"
              textLength="80%"
              lengthAdjust="spacing"
              className="font-sans font-bold tracking-tight"
              fill="url(#brandGrad16)"
              fontSize="100"
            >
              {brandName}
            </text>
          </svg>
        </motion.div>

        <div className="relative z-10 border-t border-white/10 bg-zinc-950/60 px-4 pt-9 pb-7 shadow-[0_-24px_80px_rgba(9,10,14,0.34)] backdrop-blur-md sm:px-12 sm:pt-11 sm:pb-8 lg:pt-[46px]">
          <div className="grid gap-10 lg:grid-cols-[minmax(220px,1fr)_minmax(520px,0.98fr)] lg:gap-x-20">
            <motion.div variants={riseVariants} className="max-w-2xl">
              <a
                href="/"
                className="group inline-flex min-h-10 items-center gap-2.5 text-zinc-50 transition-[opacity,transform] duration-200 ease-out hover:opacity-85 active:scale-[0.96]"
                aria-label={`${brandName} home`}
              >
                <div className="size-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-mono font-bold text-sm">
                  UX
                </div>
                <span className="text-xl leading-none font-bold tracking-wide font-mono">
                  {brandName}
                </span>
              </a>
              <p className="mt-3 text-sm max-w-lg leading-relaxed font-normal text-pretty whitespace-pre-line text-zinc-400">
                {tagline}
              </p>
            </motion.div>

            <motion.nav
              variants={sectionVariants}
              aria-label="Footer navigation"
              className="grid grid-cols-1 gap-7 min-[520px]:grid-cols-3 min-[520px]:gap-x-10 lg:gap-x-[66px]"
            >
              {columns.map((column) => (
                <motion.div variants={riseVariants} key={column.title}>
                  <h3 className="text-xs leading-none font-semibold tracking-wider text-zinc-200 uppercase font-mono">
                    {column.title}
                  </h3>
                  <motion.ul
                    variants={listVariants}
                    className="mt-4 space-y-2.5"
                  >
                    {column.links.map((link) => (
                      <motion.li variants={linkVariants} key={link.label}>
                        <a
                          href={link.href}
                          className="inline-flex min-h-5 items-center text-sm leading-tight text-zinc-400 transition-colors duration-200 ease-out hover:text-primary"
                        >
                          {link.label}
                        </a>
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.div>
              ))}
            </motion.nav>
          </div>

          <motion.div
            variants={riseVariants}
            className="mt-6 flex flex-col border-t border-zinc-800/80 pt-6 sm:mt-10 sm:flex-row sm:items-center gap-4 sm:justify-between"
          >
            <p className="text-xs font-mono text-zinc-500">
              {copyright}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <motion.ul
                variants={listVariants}
                className="flex items-center gap-2"
                aria-label="Social links"
              >
                {socials.map((social) => {
                  const Icon = socialIcons[social.icon];

                  return (
                    <motion.li variants={linkVariants} key={social.label}>
                      <a
                        href={social.href}
                        aria-label={social.label}
                        className="group relative flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-[color,transform,border-color] duration-200 ease-out hover:border-zinc-700 hover:text-white active:scale-95"
                      >
                        <Icon className="size-3.5 transition-transform duration-200 group-hover:scale-110" />
                      </a>
                    </motion.li>
                  );
                })}
              </motion.ul>

              <motion.ul
                variants={listVariants}
                className="flex flex-wrap items-center gap-x-4 sm:justify-end"
              >
                {legalLinks.map((link) => (
                  <motion.li variants={linkVariants} key={link.label}>
                    <a
                      href={link.href}
                      className="inline-flex min-h-5 items-center text-xs text-zinc-500 transition-colors duration-200 ease-out hover:text-zinc-300"
                    >
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </footer>
  );
}

export default Footer16;
