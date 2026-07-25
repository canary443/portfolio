// wrapper around the admin page. it exists for two things the client page can
// not do itself: page metadata, and the botid script.
import type { Metadata } from 'next';
import { BotIdClient } from 'botid/client';

// the login post is the only write on the site with no cookie behind it, so it
// is the only path worth a bot check. everything else already needs a session.
const PROTECTED = [{ path: '/api/admin/session', method: 'POST' }];

// belt and braces with the X-Robots-Tag header in next.config.mjs
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // this script only ships on /admin, so the public page stays untouched.
  // it patches fetch and adds the bot check header to the login call
  return (
    <>
      <BotIdClient protect={PROTECTED} />
      {children}
    </>
  );
}
